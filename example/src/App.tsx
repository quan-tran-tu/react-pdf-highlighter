import React, { useState, useEffect, useCallback, useRef } from "react";

import {
  AreaHighlight,
  Highlight,
  PdfHighlighter,
  PdfLoader,
  Popup,
  Tip,
} from "./react-pdf-highlighter";
import type {
  Content,
  IHighlight,
  NewHighlight,
  ScaledPosition,
} from "./react-pdf-highlighter";

import { Sidebar } from "./Sidebar";
import { Spinner } from "./Spinner";

import "./style/App.css";
import "../../dist/style.css";

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () =>
  document.location.hash.slice("#highlight-".length);

const resetHash = () => {
  document.location.hash = "";
};

const HighlightPopup = ({
  comment,
}: {
  comment: { text: string; emoji: string };
}) =>
  comment.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

export function App() {
  const [url, setUrl] = useState<string | null>(null); // Default PDF
  const [highlights, setHighlights] = useState<Array<IHighlight>>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Controls sidebar visibility

  const fetchHighlights = async (pdfUrl: string) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/highlights?pdfUrl=${encodeURIComponent(
          pdfUrl
        )}`
      );
      const data = await response.json();
      setHighlights(data);
    } catch (error) {
      console.error("Failed to load highlights:", error);
    }
  };

  const saveHighlightToDB = async (highlight: IHighlight) => {
    try {
      await fetch("http://localhost:5000/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...highlight, pdfUrl: url }),
      });
    } catch (error) {
      console.error("Failed to save highlight:", error);
    }
  };

  // Function to set a new PDF path and load its highlights.
  const setPdfPath = (newPath: string) => {
    setUrl(newPath);
    fetchHighlights(newPath);
  };

  const scrollViewerTo = useRef((highlight: IHighlight) => {});

  const scrollToHighlightFromHash = useCallback(() => {
    const highlight = getHighlightById(parseIdFromHash());
    if (highlight) {
      scrollViewerTo.current(highlight);
    }
  }, [highlights]);

  useEffect(() => {
    if (!url) return;
    fetchHighlights(url);
  }, [url]);

  const getHighlightById = (id: string) =>
    highlights.find((highlight) => highlight.id === id);

  const addHighlight = (highlight: NewHighlight) => {
    const newHighlight = { ...highlight, id: getNextId() };
    setHighlights((prev) => [newHighlight, ...prev]);
    saveHighlightToDB(newHighlight);
  };

  // Remove a highlight from state (to be called after successful deletion from backend)
  const removeHighlight = (id: string) => {
    setHighlights((prevHighlights) =>
      prevHighlights.filter((highlight) => highlight.id !== id)
    );
  };

  const resetHighlights = () => {
    setHighlights([]);
    resetHash();
  };

  const updateHighlight = (
    highlightId: string,
    position: Partial<ScaledPosition>,
    content: Partial<Content>
  ) => {
    console.log("Updating highlight", highlightId, position, content);
    setHighlights((prevHighlights) =>
      prevHighlights.map((h) => {
        const { id, position: originalPosition, content: originalContent, ...rest } =
          h;
        return id === highlightId
          ? {
              id,
              position: { ...originalPosition, ...position },
              content: { ...originalContent, ...content },
              ...rest,
            }
          : h;
      })
    );
  };

  return (
    <div className="App" style={{ height: "100vh", position: "relative" }}>
      {/* PDF Viewer Container (100% width) */}
      <div
        style={{
          height: "100vh",
          width: "100%",
          position: "relative",
        }}
      >
        <PdfLoader url={url} beforeLoad={url ? <Spinner /> : null}>
          {(pdfDocument) => (
            <PdfHighlighter
              pdfDocument={pdfDocument}
              enableAreaSelection={(event) => event.altKey}
              onScrollChange={resetHash}
              scrollRef={(scrollTo) => {
                scrollViewerTo.current = scrollTo;
                scrollToHighlightFromHash();
              }}
              onSelectionFinished={(
                position,
                content,
                hideTipAndSelection,
                transformSelection
              ) => (
                <Tip
                  onOpen={transformSelection}
                  onConfirm={(comment) => {
                    addHighlight({ content, position, comment });
                    hideTipAndSelection();
                  }}
                />
              )}
              highlightTransform={(
                highlight,
                index,
                setTip,
                hideTip,
                viewportToScaled,
                screenshot,
                isScrolledTo
              ) => {
                const isTextHighlight = !highlight.content?.image;

                const component = isTextHighlight ? (
                  <Highlight
                    isScrolledTo={isScrolledTo}
                    position={highlight.position}
                    comment={highlight.comment}
                  />
                ) : (
                  <AreaHighlight
                    isScrolledTo={isScrolledTo}
                    highlight={highlight}
                    onChange={(boundingRect) => {
                      updateHighlight(
                        highlight.id,
                        { boundingRect: viewportToScaled(boundingRect) },
                        { image: screenshot(boundingRect) }
                      );
                    }}
                  />
                );

                return (
                  <Popup
                    popupContent={<HighlightPopup {...highlight} />}
                    onMouseOver={(popupContent) =>
                      setTip(highlight, (highlight) => popupContent)
                    }
                    onMouseOut={hideTip}
                    key={index}
                  >
                    {component}
                  </Popup>
                );
              }}
              highlights={highlights}
            />
          )}
        </PdfLoader>

        {/* Toggle Button fixed on the right side of the screen */}
        <button
          style={{
            position: "fixed",
            top: 10,
            right: "30px", // increased offset so it doesn't overlay the scrollbar
            zIndex: 100, // Ensure it's above other elements
          }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "25vw", // 25% of the viewport width
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            zIndex: 30,
            overflowY: "auto",
            boxShadow: "2px 0 5px rgba(0,0,0,0.3)",
          }}
        >
          <Sidebar
            highlights={highlights}
            resetHighlights={resetHighlights}
            setPdfPath={setPdfPath}
            removeHighlight={removeHighlight}
          />
        </div>
      )}
    </div>
  );
}
