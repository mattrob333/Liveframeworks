"use client";

export default function BizIntakeFields({
  url,
  paragraph,
  onUrlChange,
  onParagraphChange,
  idPrefix = "biz",
  disabled = false,
}) {
  return (
    <div className="biz-fields">
      <label className="i-label" htmlFor={`${idPrefix}-url`}>Company URL</label>
      <input
        id={`${idPrefix}-url`}
        className="area key-input"
        type="url"
        inputMode="url"
        autoComplete="url"
        value={url}
        disabled={disabled}
        onChange={event => onUrlChange(event.target.value)}
        placeholder="https://www.example.com"
      />
      <label className="i-label biz-paragraph-label" htmlFor={`${idPrefix}-paragraph`}>One paragraph in their own words</label>
      <textarea
        id={`${idPrefix}-paragraph`}
        className="area"
        value={paragraph}
        disabled={disabled}
        onChange={event => onParagraphChange(event.target.value)}
        placeholder="What the company does, who it serves, and anything unusual worth knowing…"
      />
    </div>
  );
}
