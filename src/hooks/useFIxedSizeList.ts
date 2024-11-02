import { rafThrottle, useLatest, scheduleDOMUpdate, useResizeObserver, isNumber } from "../utils";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

interface UseDynamicSizeGridProps {
  rowsCount: number;
  rowHeight?: (index: number) => number;
  estimateRowHeight?: (index: number) => number;
  getRowKey: (index: number) => Key;
  columnsCount: number;
  columnWidth?: (index: number) => number;
  estimateColumnWidth?: (index: number) => number;
  getColumnKey: (index: number) => Key;
  overscanY?: number;
  overscanX?: number;
  scrollingDelay?: number;
  getScrollElement: () => HTMLElement | null;
}

type Key = string | number;

interface DynamicSizeGridRow {
  key: Key;
  index: number;
  offsetTop: number;
  height: number;
}

interface DynamicSizeGridColumn {
  key: Key;
  index: number;
  offsetLeft: number;
  width: number;
}

const DEFAULT_OVERSCAN_Y = 3; // vertical overscan to show additional rows on top and bottom
const DEFAULT_OVERSCAN_X = 1; // horizontal overscan to show additional columns on left and right
const DEFAULT_SCROLLING_DELAY = 150; // delay for isScrolling 

function validateProps(props: UseDynamicSizeGridProps) {
  const { rowHeight, estimateRowHeight, columnWidth, estimateColumnWidth } =
    props;

  if (!rowHeight && !estimateRowHeight) {
    throw new Error(
      `you must pass either "rowHeight" or "estimateRowHeight" prop`
    );
  }

  if (!columnWidth && !estimateColumnWidth) {
    throw new Error(
      `you must pass either "columnWidth" or "estimateColumnWidth" prop`
    );
  }

  if (!rowHeight && !columnWidth) {
    throw new Error(`you must pass either "rowHeight" or "columnWidth" prop`);
  }
}



export function useDynamicSizeGrid(props: UseDynamicSizeGridProps) {
  validateProps(props);

  const {
    rowHeight,
    estimateRowHeight,
    getRowKey,
    rowsCount,
    columnsCount,
    columnWidth,
    estimateColumnWidth,
    getColumnKey,
    scrollingDelay = DEFAULT_SCROLLING_DELAY,
    overscanX = DEFAULT_OVERSCAN_X,
    overscanY = DEFAULT_OVERSCAN_Y,
    getScrollElement,
  } = props;

  const [rowSizeCache, setRowSizeCache] = useState<Record<Key, number>>({});
  const [columnSizeCache, setColumnSizeCache] = useState<
    Record<string, number>
  >({});
  const [gridHeight, setGridHeight] = useState(0);
  const [gridWidth, setGridWidth] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const calculatedColumnWidths = useMemo(() => {
    if (columnWidth) {
      return Array.from({ length: columnsCount }, (_, index) =>
        columnWidth(index)
      );
    }

    const widths: number[] = Array(columnsCount);

    for (let columnIndex = 0; columnIndex < columnsCount; columnIndex++) {
      let measuredColumnWidth: number | undefined = undefined;

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
      } else {
        widths[columnIndex] = estimateColumnWidth?.(columnIndex) ?? 0;
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

  useLayoutEffect(() => {
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

  useLayoutEffect(() => {
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

    return () =>
      scrollElement.removeEventListener("scroll", throttledHandleScroll);
  }, [getScrollElement]);

  useEffect(() => {
    const scrollElement = getScrollElement();

    if (!scrollElement) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

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

  const { virtualRows, rowStartIndex, rowEndIndex, totalHeight, allRows } =
    useMemo(() => {
      const getRowHeight = (index: number) => {
        if (rowHeight) {
          return rowHeight(index);
        }

        const key = getRowKey(index);
        if (isNumber(rowSizeCache[key])) {
          return rowSizeCache[key]!;
        }

        return estimateRowHeight!(index);
      };

      const rangeStart = scrollTop;
      const rangeEnd = scrollTop + gridHeight;

      let totalHeight = 0;
      let rowStartIndex = 0;
      let rowEndIndex = 0;
      const allRows: DynamicSizeGridRow[] = Array(rowsCount);

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

  const {
    virtualColumns,
    columnStartIndex,
    columnEndIndex,
    allColumns,
    totalWidth,
  } = useMemo(() => {
    const rangeStart = scrollLeft;
    const rangeEnd = scrollLeft + gridWidth;

    let totalWidth = 0;
    let columnStartIndex = 0;
    let columnEndIndex = 0;
    const allColumns: DynamicSizeGridColumn[] = Array(columnsCount);

    for (let index = 0; index < columnsCount; index++) {
      const key = getColumnKey(index);
      const column = {
        key,
        index: index,
        width: calculatedColumnWidths[index]!,
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

    const virtualColumns = allColumns.slice(
      columnStartIndex,
      columnEndIndex + 1
    );

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

  const measureRowHeightInner = useCallback(
    (
      element: Element | null,
      resizeObserver: ResizeObserver,
      entry?: ResizeObserverEntry
    ) => {
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
        console.error(
          "dynamic rows must have a valid `data-row-index` attribute"
        );
        return;
      }
      const { measurementCache, getRowKey, allRows, scrollTop } =
        latestData.current;

      const key = getRowKey(rowIndex);
      const isResize = Boolean(entry);

      resizeObserver.observe(element);

      if (!isResize && isNumber(measurementCache[key])) {
        return;
      }

      const height =
        entry?.borderBoxSize[0]?.blockSize ??
        element.getBoundingClientRect().height;

      if (measurementCache[key] === height) {
        return;
      }

      setRowSizeCache((cache) => ({ ...cache, [key]: height }));

      const row = allRows[rowIndex]!;
      const delta = height - row.height;

      if (delta !== 0 && scrollTop > row.offsetTop) {
        const element = getScrollElement();
        if (element) {
          scheduleDOMUpdate(() => {
            element.scrollBy(0, delta);
          });
        }
      }
    },
    [latestData]
  );

  const rowHeightResizeObserver = useResizeObserver((entries, observer) => {
    entries.forEach((entry) => {
      measureRowHeightInner(entry.target, observer, entry);
    });
  });

  const measureRowHeight = useCallback(
    (element: Element | null) => {
      measureRowHeightInner(element, rowHeightResizeObserver);
    },
    [rowHeightResizeObserver]
  );

  const measureColumnWidthInner = useCallback(
    (
      element: Element | null,
      resizeObserver: ResizeObserver,
      entry?: ResizeObserverEntry
    ) => {
      if (!element) {
        return;
      }

      if (!element.isConnected) {
        resizeObserver.unobserve(element);
        return;
      }

      const rowIndexAttribute = element.getAttribute("data-row-index") || "";
      const rowIndex = parseInt(rowIndexAttribute, 10);

      const columnIndexAttribute =
        element.getAttribute("data-column-index") || "";
      const columnIndex = parseInt(columnIndexAttribute, 10);

      if (Number.isNaN(rowIndex) || Number.isNaN(columnIndex)) {
        console.error(
          "dynamic rows must have valid `data-row-index` and `data-column-index` attributes"
        );
        return;
      }

      const {
        columnSizeCache,
        getRowKey,
        getColumnKey,
        allColumns,
        scrollLeft,
      } = latestData.current;

      const key = `${getRowKey(rowIndex)}-${getColumnKey(columnIndex)}`;
      const isResize = Boolean(entry);

      resizeObserver.observe(element);

      if (!isResize && isNumber(columnSizeCache[key])) {
        return;
      }

      const width =
        entry?.borderBoxSize[0]?.inlineSize ??
        element.getBoundingClientRect().width;

      if (columnSizeCache[key] === width) {
        return;
      }

      setColumnSizeCache((cache) => ({ ...cache, [key]: width }));

      const column = allColumns[columnIndex]!;
      const delta = width - column.width;

      if (delta !== 0 && scrollLeft > column.offsetLeft) {
        const element = getScrollElement();
        if (element) {
          scheduleDOMUpdate(() => {
            element.scrollBy(delta, 0);
          });
        }
      }
    },
    [latestData]
  );

  const columnWidthResizeObserver = useResizeObserver((entries, observer) => {
    entries.forEach((entry) => {
      measureColumnWidthInner(entry.target, observer, entry);
    });
  });

  const measureColumnWidth = useCallback(
    (element: Element | null) => {
      measureColumnWidthInner(element, columnWidthResizeObserver);
    },
    [columnWidthResizeObserver]
  );

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
