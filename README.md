# react-virtual-list-sunsetik

A highly performant virtualized list component for rendering large datasets efficiently in React. This library provides both horizontal and vertical virtualization to improve rendering performance by only displaying visible items.

## Features

- **Horizontal and Vertical Virtualization**: Efficiently render large lists or grids by only rendering visible items.
- **Dynamic Size Support**: Handle dynamic row and column sizes based on content.
- **Responsive**: Automatically adjusts to the size of the container.

## Installation

To use `react-virtual-list-sunsetik`, install it via npm:

```bash
npm install react-virtual-list-sunsetik
```

Simple Usage
Here's a simple example of using the library to create a virtualized list:

```bash
import {
  useCallback,
  useRef,
  useState,
} from "react";
import { useDynamicSizeGrid } from 'react-virtual-list-sunsetik';

const createItems = () =>
  Array.from({ length: 10_000 }, (_, index) => ({
    id: Math.random().toString(36).slice(2),
    text: String(index),
  }));

const itemHeight = 40;
const containerHeight = 600;

export function Simple() {
  const [listItems, setListItems] = useState(createItems);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const { isScrolling, virtualItems, totalHeight } = useDynamicSizeGrid({
    itemHeight,
    itemsCount: listItems.length,
    listHeight: containerHeight,
    getScrollElement: useCallback(() => scrollElementRef.current, []),
  });

  return (
    <div style={{ padding: "0 12px" }}>
      <h1>List</h1>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => setListItems((items) => items.slice().reverse())}
        >
          Reverse
        </button>
      </div>
      <div
        ref={scrollElementRef}
        style={{
          height: containerHeight,
          overflow: "auto",
          border: "1px solid lightgrey",
          position: "relative",
        }}
      >
        <div style={{ height: totalHeight }}>
          {virtualItems.map((virtualItem) => {
            const item = listItems[virtualItem.index]!;

            return (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${virtualItem.offsetTop}px)`,
                  height: itemHeight,
                  padding: "6px 12px",
                }}
                key={item.id}
              >
                {isScrolling ? "Scrolling..." : item.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

Grid Usage
For a grid layout, you can use the following example:

```bash
import { useDynamicSizeGrid } from 'react-virtual-list-sunsetik';
import { useCallback, useRef, useState } from "react";

const containerHeight = 600;
const gridSize = 100;

const createItems = () =>
  Array.from({ length: gridSize }, (_) => ({
    id: Math.random().toString(36).slice(2),
    columns: Array.from({ length: gridSize }, () => ({
      id: Math.random().toString(36).slice(2),
      text: `Item ${Math.random().toString(36).slice(2)}`,
    })),
  }));

export function Grid() {
  const [gridItems, setGridItems] = useState(createItems);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const {
    virtualRows,
    totalHeight,
    measureColumnWidth,
    totalWidth,
    virtualColumns,
  } = useDynamicSizeGrid({
    rowHeight: useCallback(() => 30, []),
    rowsCount: gridSize,
    columnsCount: gridSize,
    estimateColumnWidth: useCallback(() => 100, []),
    getColumnKey: useCallback((index) => index, []),
    getScrollElement: useCallback(() => scrollElementRef.current, []),
    getRowKey: useCallback((index) => gridItems[index].id, [gridItems]),
  });

  const reverseGrid = () => {
    setGridItems((items) =>
      items.map((item) => ({
        ...item,
        columns: item.columns.slice().reverse(),
      })).reverse()
    );
  };

  return (
    <div style={{ padding: "0 12px" }}>
      <h1>Grid</h1>
      <div style={{ marginBottom: 12 }}>
        <button onClick={reverseGrid}>Reverse</button>
      </div>
      <div
        ref={scrollElementRef}
        style={{
          height: containerHeight,
          overflow: "auto",
          border: "1px solid lightgrey",
          position: "relative",
        }}
      >
        <div style={{ height: totalHeight, width: totalWidth }}>
          {virtualRows.map((virtualRow) => {
            const item = gridItems[virtualRow.index]!;

            return (
              <div
                key={item.id}
                style={{
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${virtualRow.offsetTop}px)`,
                  padding: "6px 12px",
                  height: virtualRow.height,
                }}
              >
                {virtualColumns.map((virtualColumn) => {
                  const item = gridItems[virtualRow.index]?.columns[virtualColumn.index];
                  return (
                    <div
                      data-row-index={virtualRow.index}
                      data-column-index={virtualColumn.index}
                      ref={measureColumnWidth}
                      style={{
                        position: "absolute",
                        left: virtualColumn.offsetLeft,
                        whiteSpace: "nowrap",
                      }}
                      key={virtualColumn.key}
                    >
                      {item?.text}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

## Props

### UseDynamicSizeGridProps

- **rowsCount**: _Number_ - The total number of rows in the grid.
- **rowHeight**: _Function_ - A function that returns the height of each row.
- **estimateRowHeight**: _Function_ - A function that provides an estimated height for rows.
- **getRowKey**: _Function_ - A function that returns a unique key for each row.
- **columnsCount**: _Number_ - The total number of columns in the grid.
- **columnWidth**: _Function_ - A function that returns the width of each column.
- **estimateColumnWidth**: _Function_ - A function that provides an estimated width for columns.
- **getColumnKey**: _Function_ - A function that returns a unique key for each column.
- **overscanY**: _Number_ - The number of additional rows to render outside the visible area (default: 3).
- **overscanX**: _Number_ - The number of additional columns to render outside the visible area (default: 1).
- **scrollingDelay**: _Number_ - The delay before scrolling is considered ended (default: 150 ms).
- **getScrollElement**: _Function_ - A function that returns the scrollable element.
