interface Props {
  title: string;
  message: string;
  onRetry?: () => void;
  onStartOver: () => void;
}

export function ErrorPanel({ title, message, onRetry, onStartOver }: Props) {
  return (
    <div className="stack" style={{ paddingTop: "2rem" }} role="alert">
      <h1>{title}</h1>
      <p style={{ fontSize: "1.1875rem" }}>{message}</p>
      <div className="flex flex-wrap gap-3">
        {onRetry ? (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        ) : null}
        <button type="button" className="btn" onClick={onStartOver}>
          Start over
        </button>
      </div>
    </div>
  );
}
