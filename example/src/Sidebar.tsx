import type { IHighlight } from "./react-pdf-highlighter";
import { useState, useEffect } from "react";

interface Props {
  highlights: Array<IHighlight>;
  resetHighlights: () => void;
  setPdfPath: (path: string) => void;
}

const updateHash = (highlight: IHighlight) => {
  document.location.hash = `highlight-${highlight.id}`;
};

declare const APP_VERSION: string;

export function Sidebar({ highlights, resetHighlights, setPdfPath }: Props) {
  const [pdfFiles, setPdfFiles] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch the list of PDFs from the backend
  useEffect(() => {
    fetch("http://localhost:5000/api/pdfs")
      .then((response) => response.json())
      .then((files) => {
        setPdfFiles(files);
      })
      .catch((error) => console.error("Error fetching PDF files:", error));
  }, []);

  return (
    <div className="sidebar" style={{ width: "25vw" }}>
      <div className="description" style={{ padding: "1rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>
          react-pdf-highlighter {APP_VERSION}
        </h2>

        <p style={{ fontSize: "0.7rem" }}>
          <a href="https://github.com/agentcooper/react-pdf-highlighter">
            Open in GitHub
          </a>
        </p>

        <p>
          <small>
            To create area highlight hold ⌥ Option key (Alt), then click and drag.
          </small>
        </p>

        {/* Add Change PDF button to choose pdf from ./pdf/ */}
        <div style={{ marginTop: "1rem" }}>
          <button type="button" onClick={() => setShowDropdown(!showDropdown)}>
            Change PDF
          </button>
          {showDropdown && (
            <ul
              className="pdf-list"
              style={{
                listStyle: "none",
                padding: 0,
                marginTop: "0.5rem",
                background: "#f9f9f9",
                border: "1px solid #ccc",
                borderRadius: "5px",
              }}
            >
              {pdfFiles.map((pdf, index) => (
                <li
                  key={index}
                  style={{ padding: "0.5rem", cursor: "pointer" }}
                  onClick={() => {
                    setPdfPath(`http://localhost:5000/pdf/${pdf}`);
                    setShowDropdown(false);
                  }}
                >
                  {pdf}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ul className="sidebar__highlights">
        {highlights.map((highlight, index) => (
          <li
            key={index}
            className="sidebar__highlight"
            onClick={() => {
              updateHash(highlight);
            }}
          >
            <div>
              <strong>{highlight.comment.text}</strong>
              {highlight.content.text ? (
                <blockquote style={{ marginTop: "0.5rem" }}>
                  {`${highlight.content.text.slice(0, 90).trim()}…`}
                </blockquote>
              ) : null}
              {highlight.content.image ? (
                <div className="highlight__image" style={{ marginTop: "0.5rem" }}>
                  <img src={highlight.content.image} alt="Screenshot" />
                </div>
              ) : null}
            </div>
            <div className="highlight__location">
              Page {highlight.position.pageNumber}
            </div>
          </li>
        ))}
      </ul>
      <div style={{ padding: "1rem" }}>
        {highlights.length > 0 ? (
          <button type="button" onClick={resetHighlights}>
            Reset highlights
          </button>
        ) : null}
      </div>
    </div>
  );
}
