interface UseFixedSizeListProps {
    itemsCount: number;
    itemHeight: number;
    listHeight: number;
    overscan?: number;
    scrollingDelay?: number;
    getScrollElement: () => HTMLElement | null;
}
export declare const useFixedSizeList: (props: UseFixedSizeListProps) => {
    virtualList: {
        index: number;
        offsetTop: number;
    }[];
    startIndex: number;
    endIndex: number;
    totalHeight: number;
    isScrolling: boolean;
};
export {};
