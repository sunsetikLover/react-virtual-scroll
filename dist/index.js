'use strict';

var React = require('react');

const VirtualList = () => {
    return (React.createElement("div", null, "VirtualList"));
};

const DEFAULT_OVERSCAN = 3;
const DEFAULT_SCROLLING_DELAY = 150;
const useFixedSizeList = (props) => {
    const { getScrollElement, itemHeight, itemsCount, listHeight, overscan = DEFAULT_OVERSCAN, scrollingDelay = DEFAULT_SCROLLING_DELAY, } = props;
    const [scrollTop, setScrollTop] = React.useState(0);
    const [isScrolling, setIsScrolling] = React.useState(false);
    React.useLayoutEffect(() => {
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
    React.useEffect(() => {
        const scrollElement = getScrollElement();
        if (!scrollElement) {
            return;
        }
        let timeout = null;
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
    const { virtualList, startIndex, endIndex } = React.useMemo(() => {
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

exports.VirtualList = VirtualList;
exports.useFixedSizeList = useFixedSizeList;
//# sourceMappingURL=index.js.map
