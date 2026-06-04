import { FIELD_DESCRIPTORS, type CardFieldDef } from "@als/schemas";

/**
 * Renders one CardFieldDef as a GOV.UK Design System form control, driven by
 * the shared FIELD_DESCRIPTORS table — the same field semantics the app uses,
 * drawn here as GDS HTML.
 */
export function GovukField({ field }: { field: CardFieldDef }) {
  const descriptor = FIELD_DESCRIPTORS[field.type] ?? { control: "input" };
  const id = `f-${field.key}`;
  const options = field.options ?? [];

  const label = (
    <label className="govuk-label" htmlFor={id}>
      {field.label}
    </label>
  );

  switch (descriptor.control) {
    case "readonly":
      return (
        <div className="govuk-form-group">
          <span className="govuk-label">{field.label}</span>
          <p className="govuk-body govuk-!-font-weight-bold">
            {field.placeholder || "Provided from your verified details"}
          </p>
        </div>
      );

    case "textarea":
      return (
        <div className="govuk-form-group">
          {label}
          <textarea
            className="govuk-textarea"
            id={id}
            name={field.key}
            rows={3}
          />
        </div>
      );

    case "select":
      return (
        <div className="govuk-form-group">
          {label}
          <select className="govuk-select" id={id} name={field.key}>
            <option value="">Please select</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );

    case "radios":
      return (
        <div className="govuk-form-group">
          <fieldset className="govuk-fieldset">
            <legend className="govuk-fieldset__legend">{field.label}</legend>
            <div className="govuk-radios" data-module="govuk-radios">
              {options.map((o) => (
                <div className="govuk-radios__item" key={o.value}>
                  <input
                    className="govuk-radios__input"
                    id={`${id}-${o.value}`}
                    name={field.key}
                    type="radio"
                    value={o.value}
                  />
                  <label
                    className="govuk-label govuk-radios__label"
                    htmlFor={`${id}-${o.value}`}
                  >
                    {o.label}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
      );

    case "checkboxes":
      return (
        <div className="govuk-form-group">
          <fieldset className="govuk-fieldset">
            <legend className="govuk-fieldset__legend">{field.label}</legend>
            <div className="govuk-checkboxes" data-module="govuk-checkboxes">
              {(options.length ? options : [{ value: "yes", label: field.label }]).map(
                (o) => (
                  <div className="govuk-checkboxes__item" key={o.value}>
                    <input
                      className="govuk-checkboxes__input"
                      id={`${id}-${o.value}`}
                      name={field.key}
                      type="checkbox"
                      value={o.value}
                    />
                    <label
                      className="govuk-label govuk-checkboxes__label"
                      htmlFor={`${id}-${o.value}`}
                    >
                      {o.label}
                    </label>
                  </div>
                ),
              )}
            </div>
          </fieldset>
        </div>
      );

    case "date":
      return (
        <div className="govuk-form-group">
          <fieldset className="govuk-fieldset" role="group">
            <legend className="govuk-fieldset__legend">{field.label}</legend>
            <div className="govuk-date-input" id={id}>
              {[
                ["Day", "2"],
                ["Month", "2"],
                ["Year", "4"],
              ].map(([part, width]) => (
                <div className="govuk-date-input__item" key={part}>
                  <div className="govuk-form-group">
                    <label
                      className="govuk-label govuk-date-input__label"
                      htmlFor={`${id}-${part}`}
                    >
                      {part}
                    </label>
                    <input
                      className={`govuk-input govuk-date-input__input govuk-input--width-${width}`}
                      id={`${id}-${part}`}
                      name={`${field.key}-${part.toLowerCase()}`}
                      type="text"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
      );

    case "file":
      return (
        <div className="govuk-form-group">
          {label}
          <input
            className="govuk-file-upload"
            id={id}
            name={field.key}
            type="file"
          />
        </div>
      );

    default:
      return (
        <div className="govuk-form-group">
          {label}
          <input
            className="govuk-input"
            id={id}
            name={field.key}
            type={descriptor.htmlType || "text"}
            inputMode={
              descriptor.inputMode as
                | "numeric"
                | "tel"
                | "email"
                | undefined
            }
            placeholder={field.placeholder}
          />
        </div>
      );
  }
}
