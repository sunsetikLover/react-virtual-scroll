'use strict';

var React = require('react');

function isNumber(value) {
    return typeof value === "number";
}
function useLatest(value) {
    const latestValue = React.useRef(value);
    React.useInsertionEffect(() => {
        latestValue.current = value;
    }, []);
    return latestValue;
}
function rafThrottle(cb) {
    let rafId = null;
    return function throttled(...args) {
        if (isNumber(rafId)) {
            return;
        }
        rafId = requestAnimationFrame(() => {
            cb(...args);
            rafId = null;
        });
    };
}
function useResizeObserver(cb) {
    const latestCb = useLatest(cb);
    const resizeObserver = React.useMemo(() => new ResizeObserver((entries, observer) => {
        latestCb.current(entries, observer);
    }), [latestCb]);
    React.useEffect(() => () => resizeObserver.disconnect(), [resizeObserver]);
    return resizeObserver;
}
let rafScheduled = false;
const tasks = [];
function scheduleDOMUpdate(cb) {
    tasks.push(cb);
    if (rafScheduled) {
        return;
    }
    rafScheduled = true;
    requestAnimationFrame(() => {
        const tasksToRun = [...tasks];
        tasks.length = 0;
        tasksToRun.forEach((task) => task());
        rafScheduled = false;
    });
}

const DEFAULT_OVERSCAN_Y = 3; // vertical overscan to show additional rows on top and bottom
const DEFAULT_OVERSCAN_X = 1; // horizontal overscan to show additional columns on left and right
const DEFAULT_SCROLLING_DELAY = 150; // delay for isScrolling 
function validateProps(props) {
    const { rowHeight, estimateRowHeight, columnWidth, estimateColumnWidth } = props;
    if (!rowHeight && !estimateRowHeight) {
        throw new Error(`you must pass either "rowHeight" or "estimateRowHeight" prop`);
    }
    if (!columnWidth && !estimateColumnWidth) {
        throw new Error(`you must pass either "columnWidth" or "estimateColumnWidth" prop`);
    }
    if (!rowHeight && !columnWidth) {
        throw new Error(`you must pass either "rowHeight" or "columnWidth" prop`);
    }
}
function useDynamicSizeGrid(props) {
    validateProps(props);
    const { rowHeight, estimateRowHeight, getRowKey, rowsCount, columnsCount, columnWidth, estimateColumnWidth, getColumnKey, scrollingDelay = DEFAULT_SCROLLING_DELAY, overscanX = DEFAULT_OVERSCAN_X, overscanY = DEFAULT_OVERSCAN_Y, getScrollElement, } = props;
    const [rowSizeCache, setRowSizeCache] = React.useState({});
    const [columnSizeCache, setColumnSizeCache] = React.useState({});
    const [gridHeight, setGridHeight] = React.useState(0);
    const [gridWidth, setGridWidth] = React.useState(0);
    const [scrollTop, setScrollTop] = React.useState(0);
    const [scrollLeft, setScrollLeft] = React.useState(0);
    const [isScrolling, setIsScrolling] = React.useState(false);
    const calculatedColumnWidths = React.useMemo(() => {
        var _a;
        if (columnWidth) {
            return Array.from({ length: columnsCount }, (_, index) => columnWidth(index));
        }
        const widths = Array(columnsCount);
        for (let columnIndex = 0; columnIndex < columnsCount; columnIndex++) {
            let measuredColumnWidth = undefined;
            for (let rowIndex = 0; rowIndex < rowsCount; rowIndex++) {
                const key = `${getRowKey(rowIndex)}-${getColumnKey(columnIndex)}`;
                const size = columnSizeCache[key];
                if (isNumber(size)) {
                    measuredColumnWidth = isNumber(measuredColumnWidth)
                        ? Math.max(measuredColumnWidth, size)
                        : size;
                }
            }
            if (isNumber(measuredColumnWidth)) {
                widths[columnIndex] = measuredColumnWidth;
            }
            else {
                widths[columnIndex] = (_a = estimateColumnWidth === null || estimateColumnWidth === void 0 ? void 0 : estimateColumnWidth(columnIndex)) !== null && _a !== void 0 ? _a : 0;
            }
        }
        return widths;
    }, [
        columnSizeCache,
        columnsCount,
        rowsCount,
        getRowKey,
        getColumnKey,
        columnWidth,
        estimateColumnWidth,
    ]);
    React.useLayoutEffect(() => {
        const scrollElement = getScrollElement();
        if (!scrollElement) {
            return;
        }
        const resizeObserver = new ResizeObserver(([entry]) => {
            if (!entry) {
                return;
            }
            const size = entry.borderBoxSize[0]
                ? {
                    height: entry.borderBoxSize[0].blockSize,
                    width: entry.borderBoxSize[0].inlineSize,
                }
                : entry.target.getBoundingClientRect();
            setGridHeight(size.height);
            setGridWidth(size.width);
        });
        resizeObserver.observe(scrollElement);
        return () => {
            resizeObserver.disconnect();
        };
    }, [getScrollElement]);
    React.useLayoutEffect(() => {
        const scrollElement = getScrollElement();
        if (!scrollElement) {
            return;
        }
        const handleScroll = () => {
            const { scrollTop, scrollLeft } = scrollElement;
            setScrollTop(scrollTop);
            setScrollLeft(scrollLeft);
        };
        handleScroll();
        const throttledHandleScroll = rafThrottle(handleScroll);
        scrollElement.addEventListener("scroll", throttledHandleScroll);
        return () => scrollElement.removeEventListener("scroll", throttledHandleScroll);
    }, [getScrollElement]);
    React.useEffect(() => {
        const scrollElement = getScrollElement();
        if (!scrollElement) {
            return;
        }
        let timeoutId = null;
        const handleScroll = () => {
            setIsScrolling(true);
            if (isNumber(timeoutId)) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                setIsScrolling(false);
            }, scrollingDelay);
        };
        scrollElement.addEventListener("scroll", handleScroll);
        return () => {
            if (isNumber(timeoutId)) {
                clearTimeout(timeoutId);
            }
            scrollElement.removeEventListener("scroll", handleScroll);
        };
    }, [getScrollElement]);
    const { virtualRows, rowStartIndex, rowEndIndex, totalHeight, allRows } = React.useMemo(() => {
        const getRowHeight = (index) => {
            if (rowHeight) {
                return rowHeight(index);
            }
            const key = getRowKey(index);
            if (isNumber(rowSizeCache[key])) {
                return rowSizeCache[key];
            }
            return estimateRowHeight(index);
        };
        const rangeStart = scrollTop;
        const rangeEnd = scrollTop + gridHeight;
        let totalHeight = 0;
        let rowStartIndex = 0;
        let rowEndIndex = 0;
        const allRows = Array(rowsCount);
        for (let index = 0; index < rowsCount; index++) {
            const key = getRowKey(index);
            const row = {
                key,
                index: index,
                height: getRowHeight(index),
                offsetTop: totalHeight,
            };
            totalHeight += row.height;
            allRows[index] = row;
            if (row.offsetTop + row.height < rangeStart) {
                rowStartIndex++;
            }
            if (row.offsetTop + row.height < rangeEnd) {
                rowEndIndex++;
            }
        }
        rowStartIndex = Math.max(0, rowStartIndex - overscanY);
        rowEndIndex = Math.min(rowsCount - 1, rowEndIndex + overscanY);
        const virtualRows = allRows.slice(rowStartIndex, rowEndIndex + 1);
        return {
            virtualRows,
            rowStartIndex,
            rowEndIndex,
            allRows,
            totalHeight,
        };
    }, [
        scrollTop,
        overscanY,
        gridHeight,
        rowHeight,
        getRowKey,
        estimateRowHeight,
        rowSizeCache,
        rowsCount,
    ]);
    const { virtualColumns, columnStartIndex, columnEndIndex, allColumns, totalWidth, } = React.useMemo(() => {
        const rangeStart = scrollLeft;
        const rangeEnd = scrollLeft + gridWidth;
        let totalWidth = 0;
        let columnStartIndex = 0;
        let columnEndIndex = 0;
        const allColumns = Array(columnsCount);
        for (let index = 0; index < columnsCount; index++) {
            const key = getColumnKey(index);
            const column = {
                key,
                index: index,
                width: calculatedColumnWidths[index],
                offsetLeft: totalWidth,
            };
            totalWidth += column.width;
            allColumns[index] = column;
            if (column.offsetLeft + column.width < rangeStart) {
                columnStartIndex++;
            }
            if (column.offsetLeft + column.width <= rangeEnd) {
                columnEndIndex++;
            }
        }
        columnStartIndex = Math.max(0, columnStartIndex - overscanY);
        columnEndIndex = Math.min(columnsCount - 1, columnEndIndex + overscanY);
        const virtualColumns = allColumns.slice(columnStartIndex, columnEndIndex + 1);
        return {
            virtualColumns,
            columnStartIndex,
            columnEndIndex,
            allColumns,
            totalWidth,
        };
    }, [
        scrollLeft,
        overscanX,
        gridWidth,
        calculatedColumnWidths,
        getColumnKey,
        columnsCount,
    ]);
    const latestData = useLatest({
        columnSizeCache,
        allColumns,
        scrollLeft,
        getColumnKey,
        measurementCache: rowSizeCache,
        getRowKey,
        allRows,
        getScrollElement,
        scrollTop,
    });
    const measureRowHeightInner = React.useCallback((element, resizeObserver, entry) => {
        var _a, _b;
        if (!element) {
            return;
        }
        if (!element.isConnected) {
            resizeObserver.unobserve(element);
            return;
        }
        const rowIndexAttribute = element.getAttribute("data-row-index") || "";
        const rowIndex = parseInt(rowIndexAttribute, 10);
        if (Number.isNaN(rowIndex)) {
            console.error("dynamic rows must have a valid `data-row-index` attribute");
            return;
        }
        const { measurementCache, getRowKey, allRows, scrollTop } = latestData.current;
        const key = getRowKey(rowIndex);
        const isResize = Boolean(entry);
        resizeObserver.observe(element);
        if (!isResize && isNumber(measurementCache[key])) {
            return;
        }
        const height = (_b = (_a = entry === null || entry === void 0 ? void 0 : entry.borderBoxSize[0]) === null || _a === void 0 ? void 0 : _a.blockSize) !== null && _b !== void 0 ? _b : element.getBoundingClientRect().height;
        if (measurementCache[key] === height) {
            return;
        }
        setRowSizeCache((cache) => (Object.assign(Object.assign({}, cache), { [key]: height })));
        const row = allRows[rowIndex];
        const delta = height - row.height;
        if (delta !== 0 && scrollTop > row.offsetTop) {
            const element = getScrollElement();
            if (element) {
                scheduleDOMUpdate(() => {
                    element.scrollBy(0, delta);
                });
            }
        }
    }, [latestData]);
    const rowHeightResizeObserver = useResizeObserver((entries, observer) => {
        entries.forEach((entry) => {
            measureRowHeightInner(entry.target, observer, entry);
        });
    });
    const measureRowHeight = React.useCallback((element) => {
        measureRowHeightInner(element, rowHeightResizeObserver);
    }, [rowHeightResizeObserver]);
    const measureColumnWidthInner = React.useCallback((element, resizeObserver, entry) => {
        var _a, _b;
        if (!element) {
            return;
        }
        if (!element.isConnected) {
            resizeObserver.unobserve(element);
            return;
        }
        const rowIndexAttribute = element.getAttribute("data-row-index") || "";
        const rowIndex = parseInt(rowIndexAttribute, 10);
        const columnIndexAttribute = element.getAttribute("data-column-index") || "";
        const columnIndex = parseInt(columnIndexAttribute, 10);
        if (Number.isNaN(rowIndex) || Number.isNaN(columnIndex)) {
            console.error("dynamic rows must have valid `data-row-index` and `data-column-index` attributes");
            return;
        }
        const { columnSizeCache, getRowKey, getColumnKey, allColumns, scrollLeft, } = latestData.current;
        const key = `${getRowKey(rowIndex)}-${getColumnKey(columnIndex)}`;
        const isResize = Boolean(entry);
        resizeObserver.observe(element);
        if (!isResize && isNumber(columnSizeCache[key])) {
            return;
        }
        const width = (_b = (_a = entry === null || entry === void 0 ? void 0 : entry.borderBoxSize[0]) === null || _a === void 0 ? void 0 : _a.inlineSize) !== null && _b !== void 0 ? _b : element.getBoundingClientRect().width;
        if (columnSizeCache[key] === width) {
            return;
        }
        setColumnSizeCache((cache) => (Object.assign(Object.assign({}, cache), { [key]: width })));
        const column = allColumns[columnIndex];
        const delta = width - column.width;
        if (delta !== 0 && scrollLeft > column.offsetLeft) {
            const element = getScrollElement();
            if (element) {
                scheduleDOMUpdate(() => {
                    element.scrollBy(delta, 0);
                });
            }
        }
    }, [latestData]);
    const columnWidthResizeObserver = useResizeObserver((entries, observer) => {
        entries.forEach((entry) => {
            measureColumnWidthInner(entry.target, observer, entry);
        });
    });
    const measureColumnWidth = React.useCallback((element) => {
        measureColumnWidthInner(element, columnWidthResizeObserver);
    }, [columnWidthResizeObserver]);
    return {
        virtualRows,
        totalHeight,
        rowStartIndex,
        rowEndIndex,
        isScrolling,
        allRows,
        measureRowHeight,
        virtualColumns,
        columnStartIndex,
        columnEndIndex,
        allColumns,
        totalWidth,
        measureColumnWidth,
    };
}

const containerHeight = 600;
const gridSize = 100;
const createItems = () => Array.from({ length: gridSize }, () => ({
    id: Math.random().toString(36).slice(2),
    columns: Array.from({ length: gridSize }, () => ({
        id: Math.random().toString(36).slice(2),
        text: Math.random().toString(36).slice(2),
    })),
}));
function Grid() {
    const [gridItems, setGridItems] = React.useState(createItems);
    const scrollElementRef = React.useRef(null);
    const { virtualRows, totalHeight, measureColumnWidth, totalWidth, virtualColumns, } = useDynamicSizeGrid({
        rowHeight: React.useCallback(() => 30, []),
        rowsCount: gridSize,
        columnsCount: gridSize,
        estimateColumnWidth: React.useCallback(() => 100, []),
        getColumnKey: React.useCallback((index) => index, []),
        getScrollElement: React.useCallback(() => scrollElementRef.current, []),
        getRowKey: React.useCallback((index) => gridItems[index].id, [gridItems]),
    });
    const reverseGrid = () => {
        setGridItems((items) => items
            .map((item) => (Object.assign(Object.assign({}, item), { columns: item.columns.slice().reverse() })))
            .reverse());
    };
    return (React.createElement("div", { style: { padding: "0 12px" } },
        React.createElement("h1", null, "List"),
        React.createElement("div", { style: { marginBottom: 12 } },
            React.createElement("button", { onClick: reverseGrid }, "reverse")),
        React.createElement("div", { ref: scrollElementRef, style: {
                height: containerHeight,
                overflow: "auto",
                border: "1px solid lightgrey",
                position: "relative",
            } },
            React.createElement("div", { style: { height: totalHeight, width: totalWidth } }, virtualRows.map((virtualRow) => {
                const item = gridItems[virtualRow.index];
                return (React.createElement("div", { key: item.id, style: {
                        position: "absolute",
                        top: 0,
                        transform: `translateY(${virtualRow.offsetTop}px)`,
                        padding: "6px 12px",
                        height: virtualRow.height,
                    } }, virtualColumns.map((virtualColumn) => {
                    var _a;
                    const item = (_a = gridItems[virtualRow.index]) === null || _a === void 0 ? void 0 : _a.columns[virtualColumn.index];
                    return (React.createElement("div", { "data-row-index": virtualRow.index, "data-column-index": virtualColumn.index, ref: measureColumnWidth, style: {
                            position: "absolute",
                            left: virtualColumn.offsetLeft,
                            whiteSpace: "nowrap",
                        }, key: virtualColumn.key }, item === null || item === void 0 ? void 0 : item.text));
                })));
            })))));
}

exports.Grid = Grid;
exports.isNumber = isNumber;
exports.rafThrottle = rafThrottle;
exports.scheduleDOMUpdate = scheduleDOMUpdate;
exports.useDynamicSizeGrid = useDynamicSizeGrid;
exports.useLatest = useLatest;
exports.useResizeObserver = useResizeObserver;
//# sourceMappingURL=index.js.map
