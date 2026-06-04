"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders a Markdown capability card with GOV.UK typography classes. */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: (p) => <h2 className="govuk-heading-l" {...p} />,
        h2: (p) => <h3 className="govuk-heading-m" {...p} />,
        h3: (p) => <h4 className="govuk-heading-s" {...p} />,
        p: (p) => <p className="govuk-body" {...p} />,
        ul: (p) => <ul className="govuk-list govuk-list--bullet" {...p} />,
        ol: (p) => <ol className="govuk-list govuk-list--number" {...p} />,
        a: (p) => <a className="govuk-link" {...p} />,
        blockquote: (p) => (
          <div className="govuk-inset-text">{p.children}</div>
        ),
        hr: () => <hr className="govuk-section-break govuk-section-break--visible govuk-section-break--l" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
