# Extractable components

## NavBar

- Source: `components/Nav.jsx`
- Category: layout
- Description: Shared compact top navigation with brand, Pipeline, Export, and API Key state.
- Extractable props: `activeItem` (string, default `pipeline`), `hasKey` (boolean, default `false`).
- Hardcoded: brand text, navigation labels, route destinations, key status dot, typography and CSS classes.

## AgentChat

- Source: `components/Chat.jsx`
- Category: basic
- Description: Reusable agent conversation surface with message history, thinking state, and composer.
- Extractable props: `agentName` (string), `agentRole` (string), `busy` (boolean), `messages` (array), `starterPrompt` (string).
- Hardcoded: sender treatments, Send action, amber agent styling, message/composer structure.

## PipelineNode

- Source: inline in `app/page.jsx`
- Category: basic
- Description: Framework card showing icon, name, output type, online/standby state, and completion.
- Extractable props: `name`, `icon`, `output`, `status`, `completed`, `href`.
- Hardcoded: status vocabulary and node visual treatment.

## IntakeEditor

- Source: inline in `app/page.jsx`
- Category: basic
- Description: Sticky evidence-bucket panel with guidance, template, textarea, upload, save, and reader links.
- Extractable props: `title`, `description`, `guide`, `template`, `value`, `status`, `readers`.
- Hardcoded: action labels, upload formats, persistence note.

## FrameworkWorkspace

- Source: `app/framework/[id]/page.jsx`
- Category: layout
- Description: Two-column framework analysis surface combining visual template/provenance with AgentChat.
- Extractable props: `frameworkName`, `role`, `online`, `output`, `hasOutput`.
- Hardcoded: evidence/tool/document sections and shared shell styling.
