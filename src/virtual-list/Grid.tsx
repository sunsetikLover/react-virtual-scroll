import React from "react";
import { useDynamicSizeGrid } from "../hooks";
import {
  useCallback,
  useRef,
  useState,
} from "react";

const containerHeight = 600;
const gridSize = 100

const createItems = () =>
  Array.from({ length: gridSize }, () => ({
    id: Math.random().toString(36).slice(2),
    columns: Array.from({ length: gridSize }, () => ({
      id: Math.random().toString(36).slice(2),
      text: Math.random().toString(36).slice(2),
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
      items
        .map((item) => ({
          ...item,
          columns: item.columns.slice().reverse(),
        }))
        .reverse()
    );
  };

  return (
    <div style={{ padding: "0 12px" }}>
      <h1>List</h1>
      <div style={{ marginBottom: 12 }}>
        <button onClick={reverseGrid}>reverse</button>
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
                  const item =
                    gridItems[virtualRow.index]?.columns[virtualColumn.index];
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