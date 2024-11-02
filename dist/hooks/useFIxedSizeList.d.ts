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
export declare function useDynamicSizeGrid(props: UseDynamicSizeGridProps): {
    virtualRows: DynamicSizeGridRow[];
    totalHeight: number;
    rowStartIndex: number;
    rowEndIndex: number;
    isScrolling: boolean;
    allRows: DynamicSizeGridRow[];
    measureRowHeight: (element: Element | null) => void;
    virtualColumns: DynamicSizeGridColumn[];
    columnStartIndex: number;
    columnEndIndex: number;
    allColumns: DynamicSizeGridColumn[];
    totalWidth: number;
    measureColumnWidth: (element: Element | null) => void;
};
export {};
