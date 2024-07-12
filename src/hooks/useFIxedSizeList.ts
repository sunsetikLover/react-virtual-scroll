import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

interface UseFixedSizeListProps {
  itemsCount: number;
  itemHeight: number;
  listHeight: number;
  overscan?: number;
  scrollingDelay?: number;
  getScrollElement: () => HTMLElement | null;
}

const DEFAULT_OVERSCAN = 3;
const DEFAULT_SCROLLING_DELAY = 150;

export const useFixedSizeList = (props: UseFixedSizeListProps) => {
  const {
    getScrollElement,
    itemHeight,
    itemsCount,
    listHeight,
    overscan = DEFAULT_OVERSCAN,
    scrollingDelay = DEFAULT_SCROLLING_DELAY,
  } = props;

  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  useLayoutEffect(() => {
    const scrollElement = getScrollElement();

    if (!scrollElement) {
      return;
    }

    const handleScroll = () => {
      setScrollTop(scrollElement.scrollTop);
    };

    handleScroll();

    scrollElement.addEventListener("scroll", handleScroll);

    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [getScrollElement]);

  useEffect(() => {
    const scrollElement = getScrollElement();

    if (!scrollElement) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;

    const handleScrolling = () => {
      setIsScrolling(true);

      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        setIsScrolling(false);
      }, scrollingDelay);
    };

    scrollElement.addEventListener("scroll", handleScrolling);

    return () => {
      scrollElement.removeEventListener("scroll", handleScrolling);
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [getScrollElement, scrollingDelay]);

  const { virtualList, startIndex, endIndex } = useMemo(() => {
    const rangeStart = scrollTop;
    const rangeEnd = scrollTop + listHeight;

    let startIndex = Math.floor(rangeStart / itemHeight);
    let endIndex = Math.ceil(rangeEnd / itemHeight);

    startIndex = Math.max(0, startIndex - overscan);
    endIndex = Math.min(itemsCount - 1, endIndex + overscan);

    const virtualList = [];

    for (let index = startIndex; index <= endIndex; index++) {
      virtualList.push({
        index,
        offsetTop: index * itemHeight,
      });
    }

    return {
      virtualList,
      startIndex,
      endIndex,
    };
  }, [itemHeight, itemsCount, listHeight, overscan, scrollTop]);

  const totalHeight = itemsCount * itemHeight;

  return {
    virtualList,
    startIndex,
    endIndex,
    totalHeight,
    isScrolling,
  };
};
