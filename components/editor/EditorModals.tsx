"use client";

type EditorModalsProps = {
  showLeaveModal: boolean;
  onDismissLeave: () => void;
  onConfirmLeave: () => void;
  errorMessage: string;
  onDismissError: () => void;
  showUpdateModal: boolean;
  onSaveOnly: () => void;
  onSaveAndStudy: () => void;
  onDismissUpdate: () => void;
};

export function EditorModals({
  showLeaveModal,
  onDismissLeave,
  onConfirmLeave,
  errorMessage,
  onDismissError,
  showUpdateModal,
  onSaveOnly,
  onSaveAndStudy,
  onDismissUpdate,
}: EditorModalsProps) {
  return (
    <>
      {showLeaveModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              width: "300px",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: "10px" }}>Unsaved changes</h3>

            <p style={{ marginBottom: "20px", fontSize: "14px" }}>
              You have unsaved changes. Are you sure you want to leave?
            </p>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={onDismissLeave}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onConfirmLeave}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#dc2626",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              width: "300px",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: "10px" }}>Validation Error</h3>

            <p style={{ marginBottom: "20px", fontSize: "14px" }}>
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={onDismissError}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#2563eb",
                color: "white",
                cursor: "pointer",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              width: "320px",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: "10px" }}>Flashcards may be outdated</h3>

            <p style={{ marginBottom: "20px", fontSize: "14px" }}>
              You’ve changed your notes. Your flashcards may no longer match.
            </p>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <button
                type="button"
                onClick={onSaveOnly}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#16a34a",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Save Only
              </button>

              <button
                type="button"
                onClick={onSaveAndStudy}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Save & Go to Study
              </button>

              <button
                type="button"
                onClick={onDismissUpdate}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
