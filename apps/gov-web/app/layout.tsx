import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "future.gov.uk — prototype",
  description:
    "A prototype GOV.UK surface rendered from services and plans published in the Legibility Studio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="govuk-template">
      <body className="govuk-template__body">
        <a href="#main-content" className="govuk-skip-link" data-module="govuk-skip-link">
          Skip to main content
        </a>

        <header className="govuk-header" data-module="govuk-header">
          <div className="govuk-header__container govuk-width-container">
            <div className="govuk-header__logo">
              <a href="/" className="govuk-header__link govuk-header__link--homepage">
                <span className="govuk-header__logotype-text">GOV.UK</span>
              </a>
            </div>
            <div className="govuk-header__content">
              <a href="/" className="govuk-header__link govuk-header__service-name">
                future.gov.uk
              </a>
            </div>
          </div>
        </header>

        <div className="govuk-width-container">
          <div className="govuk-phase-banner">
            <p className="govuk-phase-banner__content">
              <strong className="govuk-tag govuk-phase-banner__content__tag">
                Prototype
              </strong>
              <span className="govuk-phase-banner__text">
                Rendered live from services and plans published in the Legibility
                Studio.
              </span>
            </p>
          </div>

          <main className="govuk-main-wrapper" id="main-content" role="main">
            {children}
          </main>
        </div>

        <footer className="govuk-footer">
          <div className="govuk-width-container">
            <div className="govuk-footer__meta">
              <div className="govuk-footer__meta-item govuk-footer__meta-item--grow">
                <span className="govuk-footer__licence-description">
                  A prototype of the agentic legibility stack — one published
                  artefact set, rendered for web, app and agent.
                </span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
