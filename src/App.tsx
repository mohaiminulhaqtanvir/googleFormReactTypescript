import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlignLeft, CalendarDays, Check, CheckSquare, ChevronDown, CircleDot,
  Copy, Eye, FileText, Hash, ListPlus, Menu, Plus, Save,
  Settings2, Trash2, Type, UploadCloud, X, RotateCcw
} from "lucide-react";

type QuestionType =
  | "short" | "paragraph" | "radio" | "checkbox" | "dropdown"
  | "date" | "number" | "file" | "scale";

type Question = {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options: string[];
};

type FormSection = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
};

const questionTypes: { type: QuestionType; label: string; icon: ReactNode }[] = [
  { type: "short", label: "Short answer", icon: <Type /> },
  { type: "paragraph", label: "Paragraph", icon: <AlignLeft /> },
  { type: "radio", label: "Multiple choice", icon: <CircleDot /> },
  { type: "checkbox", label: "Checkboxes", icon: <CheckSquare /> },
  { type: "dropdown", label: "Dropdown", icon: <ChevronDown /> },
  { type: "date", label: "Date", icon: <CalendarDays /> },
  { type: "number", label: "Number", icon: <Hash /> },
  { type: "file", label: "File upload", icon: <UploadCloud /> },
  { type: "scale", label: "Linear scale", icon: <ListPlus /> },
];

const uid = () => Math.random().toString(36).slice(2, 10);

const newQuestion = (type: QuestionType = "short"): Question => ({
  id: uid(),
  type,
  title: "Untitled question",
  required: false,
  options: type === "radio" || type === "checkbox" || type === "dropdown"
    ? ["Option 1", "Option 2", "Option 3"] : [],
});

const initialSections: FormSection[] = [
  {
    id: uid(),
    title: "Personal Information",
    description: "Tell us about yourself.",
    questions: [
      { ...newQuestion("short"), title: "Full Name", required: true },
      { ...newQuestion("short"), title: "Email Address", required: true },
      { ...newQuestion("radio"), title: "Gender", required: true, options: ["Male", "Female", "Other"] },
      { ...newQuestion("date"), title: "Date of Birth", required: false },
    ],
  },
  {
    id: uid(),
    title: "Additional Information",
    description: "A few more details.",
    questions: [
      { ...newQuestion("dropdown"), title: "Profession", required: true, options: ["Student", "Employee", "Business", "Other"] },
      { ...newQuestion("paragraph"), title: "Comments", required: false },
    ],
  },
];

function App() {
  const [formTitle, setFormTitle] = useState("Registration Form");
  const [formDescription, setFormDescription] = useState("Please fill out the form below.");
  const [sections, setSections] = useState<FormSection[]>(initialSections);
  const [activeSection, setActiveSection] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(initialSections[0].questions[0].id);
  const [preview, setPreview] = useState(false);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState("");

  const section = sections[activeSection];
  const allQuestions = useMemo(() => sections.flatMap(s => s.questions), [sections]);

  const updateSection = (patch: Partial<FormSection>) => {
    setSections(old => old.map((s, i) => i === activeSection ? { ...s, ...patch } : s));
  };

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setSections(old => old.map(s => ({
      ...s,
      questions: s.questions.map(q => q.id === id ? { ...q, ...patch } : q),
    })));
  };

  const addQuestion = (type: QuestionType = "short") => {
    const q = newQuestion(type);
    updateSection({ questions: [...section.questions, q] });
    setSelectedId(q.id);
    setPreview(false);
  };

  const deleteQuestion = (id: string) => {
    const next = section.questions.filter(q => q.id !== id);
    updateSection({ questions: next });
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  const duplicateQuestion = (q: Question) => {
    const copyQ = { ...q, id: uid(), options: [...q.options] };
    const index = section.questions.findIndex(item => item.id === q.id);
    const next = [...section.questions];
    next.splice(index + 1, 0, copyQ);
    updateSection({ questions: next });
    setSelectedId(copyQ.id);
  };

  const addSection = () => {
    const s: FormSection = {
      id: uid(),
      title: `Section ${sections.length + 1}`,
      description: "Section description",
      questions: [],
    };
    setSections(old => [...old, s]);
    setActiveSection(sections.length);
    setSelectedId(null);
    setPreview(false);
  };

  const saveJson = () => {
    const blob = new Blob(
      [JSON.stringify({ title: formTitle, description: formDescription, sections }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "form-definition.json";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Form definition exported as JSON");
    window.setTimeout(() => setToast(""), 2500);
  };

  const reset = () => {
    setFormTitle("Registration Form");
    setFormDescription("Please fill out the form below.");
    setSections(initialSections.map(s => ({ ...s, id: uid(), questions: s.questions.map(q => ({ ...q, id: uid() })) })));
    setActiveSection(0);
    setSelectedId(null);
    setResponses({});
    setSubmitted(false);
    setPreview(false);
  };

  const submitResponse = (event: FormEvent) => {
    event.preventDefault();
    const current = sections[activeSection];
    const missing = current.questions.find(q => q.required && (
      responses[q.id] === undefined ||
      responses[q.id] === "" ||
      (Array.isArray(responses[q.id]) && (responses[q.id] as string[]).length === 0)
    ));
    if (missing) {
      document.getElementById(`preview-${missing.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (activeSection < sections.length - 1) {
      setActiveSection(i => i + 1);
      return;
    }
    const responseData = Object.fromEntries(allQuestions.map(q => [q.title, responses[q.id] ?? ""]));
    console.log("Submitted response:", responseData);
    setSubmitted(true);
  };

  const updateResponse = (id: string, value: string | string[]) => {
    setResponses(old => ({ ...old, [id]: value }));
  };

  const renderAnswer = (q: Question, disabled = false) => {
    const value = responses[q.id];
    const inputClass = "answer-input";
    if (q.type === "short" || q.type === "number" || q.type === "date") {
      return <input className={inputClass} type={q.type === "short" ? "text" : q.type} placeholder={q.type === "date" ? "" : "Your answer"} value={String(value ?? "")} onChange={e => updateResponse(q.id, e.target.value)} disabled={disabled} required={q.required} />;
    }
    if (q.type === "paragraph") {
      return <textarea className={inputClass} rows={3} placeholder="Your answer" value={String(value ?? "")} onChange={e => updateResponse(q.id, e.target.value)} disabled={disabled} required={q.required} />;
    }
    if (q.type === "dropdown") {
      return <select className={inputClass} value={String(value ?? "")} onChange={e => updateResponse(q.id, e.target.value)} disabled={disabled} required={q.required}><option value="">Select an option</option>{q.options.map((o, i) => <option key={i} value={o}>{o}</option>)}</select>;
    }
    if (q.type === "file") {
      return <input type="file" className={inputClass} disabled={disabled} onChange={e => updateResponse(q.id, e.target.files?.[0]?.name ?? "")} required={q.required} />;
    }
    if (q.type === "scale") {
      return <div className="scale-options">{[1, 2, 3, 4, 5].map(n => <label key={n}><input type="radio" name={q.id} checked={String(value ?? "") === String(n)} onChange={() => updateResponse(q.id, String(n))} disabled={disabled} required={q.required && n === 1} /><span>{n}</span></label>)}</div>;
    }
    return <div className="choice-list">{q.options.map((o, i) => {
      const isCheckbox = q.type === "checkbox";
      const selected = isCheckbox ? (Array.isArray(value) && value.includes(o)) : value === o;
      return <label className="choice" key={`${q.id}-${i}`}>
        <input type={isCheckbox ? "checkbox" : "radio"} name={q.id} checked={selected} disabled={disabled}
          onChange={e => {
            if (isCheckbox) {
              const current = Array.isArray(value) ? value : [];
              updateResponse(q.id, e.target.checked ? [...current, o] : current.filter(v => v !== o));
            } else updateResponse(q.id, o);
          }}
          required={q.required && !isCheckbox && i === 0}
        />
        <span>{o}</span>
      </label>;
    })}</div>;
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Menu size={25} /></div>
          <div><h1>Form Builder</h1><p>Create your own form easily</p></div>
        </div>
        <div className="top-actions">
          <button className={`btn btn-light ${preview ? "active" : ""}`} onClick={() => setPreview(v => !v)}><Eye size={17} />{preview ? "Edit form" : "Preview"}</button>
          <button className="btn btn-primary" onClick={saveJson}><Save size={17} />Save JSON</button>
          <button className="btn btn-light" onClick={reset}><RotateCcw size={16} />Reset</button>
        </div>
      </header>

      {preview ? (
        <main className="preview-page">
          {submitted ? (
            <div className="submitted-card"><div className="success-icon"><Check size={26} /></div><h2>Your response has been recorded.</h2><p>Thank you for filling out this form.</p><button className="btn btn-primary" onClick={() => { setResponses({}); setSubmitted(false); setActiveSection(0); }}>Submit another response</button></div>
          ) : (
            <form className="preview-form" onSubmit={submitResponse}>
              <div className="preview-title"><h1>{formTitle}</h1><p>{formDescription}</p><small><b>*</b> Required question</small></div>
              <div className="preview-section-heading"><h2>Section {activeSection + 1}: {section.title}</h2><p>{section.description}</p></div>
              {section.questions.map((q, i) => <div className="preview-question" id={`preview-${q.id}`} key={q.id}>
                <label className="preview-q-title">{i + 1}. {q.title}{q.required && <b className="required-star"> *</b>}</label>
                {renderAnswer(q)}
              </div>)}
              <div className="preview-actions">
                <button type="button" className="btn btn-light" disabled={activeSection === 0} onClick={() => setActiveSection(i => Math.max(0, i - 1))}>Back</button>
                <button type="submit" className="btn btn-primary">{activeSection === sections.length - 1 ? "Submit" : "Next"}</button>
              </div>
              <div className="progress-row"><div className="progress-track"><span style={{ width: `${((activeSection + 1) / sections.length) * 100}%` }} /></div><small>Section {activeSection + 1} of {sections.length}</small></div>
            </form>
          )}
        </main>
      ) : (
        <main className="builder-layout">
          <aside className="left-sidebar">
            <h3>Question Types</h3>
            <div className="type-list">
              {questionTypes.map(item => <button className="type-button" key={item.type} onClick={() => addQuestion(item.type)}>{item.icon}<span>{item.label}</span><Plus size={15} className="type-plus" /></button>)}
            </div>
            <div className="sidebar-section">
              <h3>Form Sections</h3>
              <div className="section-list">{sections.map((s, i) => <button key={s.id} className={`section-tab ${i === activeSection ? "selected" : ""}`} onClick={() => { setActiveSection(i); setSelectedId(s.questions[0]?.id ?? null); }}><FileText size={16} /><span>{s.title || `Section ${i + 1}`}</span></button>)}</div>
              <button className="btn btn-primary add-section" onClick={addSection}><Plus size={17} />Add Section</button>
            </div>
            <div className="sidebar-section settings">
              <h3><Settings2 size={17} /> Form Settings</h3>
              <div className="setting-line"><span>Required validation</span><span className="setting-on"><Check size={12} /></span></div>
              <div className="setting-line"><span>Submit confirmation</span><span className="setting-on"><Check size={12} /></span></div>
            </div>
          </aside>

          <section className="editor-column">
            <div className="form-banner">
              <input className="form-title-input" value={formTitle} onChange={e => setFormTitle(e.target.value)} aria-label="Form title" />
              <textarea className="form-description-input" value={formDescription} onChange={e => setFormDescription(e.target.value)} aria-label="Form description" rows={1} />
            </div>
            <div className="section-tabs">
              {sections.map((s, i) => <button key={s.id} className={`section-tab-main ${i === activeSection ? "active" : ""}`} onClick={() => { setActiveSection(i); setSelectedId(s.questions[0]?.id ?? null); }}>Section {i + 1}</button>)}
              <button className="add-section-inline" onClick={addSection}><Plus size={17} />Add Section</button>
            </div>
            <div className="section-editor">
              <input className="section-title-input" value={section.title} onChange={e => updateSection({ title: e.target.value })} aria-label="Section title" />
              <input className="section-desc-input" value={section.description} onChange={e => updateSection({ description: e.target.value })} aria-label="Section description" placeholder="Section description" />
            </div>

            {section.questions.map((q, i) => (
              <article key={q.id} className={`question-card ${selectedId === q.id ? "question-selected" : ""}`} onClick={() => setSelectedId(q.id)}>
                <div className="question-card-top">
                  <span className="drag-dots">⠿</span>
                  <span className="question-number">{i + 1}.</span>
                  <input className="question-title-input" value={q.title} onClick={e => e.stopPropagation()} onChange={e => updateQuestion(q.id, { title: e.target.value })} aria-label="Question title" />
                  <span className="type-pill">{questionTypes.find(t => t.type === q.type)?.label}</span>
                  <div className="question-tools">
                    <button title="Duplicate question" onClick={e => { e.stopPropagation(); duplicateQuestion(q); }}><Copy size={17} /></button>
                    <button title="Delete question" onClick={e => { e.stopPropagation(); deleteQuestion(q.id); }}><Trash2 size={17} /></button>
                  </div>
                </div>

                {(q.type === "radio" || q.type === "checkbox" || q.type === "dropdown") && (
                  <div className="options-editor">
                    {q.options.map((option, oi) => <div className="option-edit-row" key={`${q.id}-${oi}`}>
                      {q.type === "radio" ? <CircleDot size={16} /> : q.type === "checkbox" ? <CheckSquare size={16} /> : <span className="option-number">{oi + 1}.</span>}
                      <input value={option} onChange={e => updateQuestion(q.id, { options: q.options.map((v, j) => j === oi ? e.target.value : v) })} aria-label={`Option ${oi + 1}`} />
                      <button title="Remove option" onClick={() => updateQuestion(q.id, { options: q.options.filter((_, j) => j !== oi) })}><X size={15} /></button>
                    </div>)}
                    <button className="add-option" onClick={() => updateQuestion(q.id, { options: [...q.options, `Option ${q.options.length + 1}`] })}><Plus size={14} />Add option</button>
                  </div>
                )}

                <div className="question-card-footer">
                  <label className="required-toggle"><input type="checkbox" checked={q.required} onChange={e => updateQuestion(q.id, { required: e.target.checked })} />Required</label>
                  <span className="footer-divider" />
                  <button className="footer-action" title="Duplicate" onClick={() => duplicateQuestion(q)}><Copy size={16} />Duplicate</button>
                  <button className="footer-action delete-action" title="Delete" onClick={() => deleteQuestion(q.id)}><Trash2 size={16} />Delete</button>
                </div>
              </article>
            ))}

            <button className="add-question-wide" onClick={() => addQuestion("short")}><Plus size={18} />Add Question</button>
            {section.questions.length === 0 && <p className="empty-note">No questions in this section yet. Choose a question type from the left.</p>}
          </section>

          <aside className="right-sidebar">
            <div className="preview-heading"><h3>Form Preview</h3><button title="Preview form" onClick={() => setPreview(true)}><Eye size={18} /></button></div>
            <div className="mini-preview">
              <div className="mini-preview-banner"><h2>{formTitle || "Untitled form"}</h2><p>{formDescription}</p></div>
              <div className="mini-preview-section"><h3>Section {activeSection + 1}: {section.title}</h3><p>{section.description}</p></div>
              {section.questions.map((q, i) => <div className="mini-question" key={q.id}>
                <div className="mini-q-title">{i + 1}. {q.title}{q.required && <b className="required-star"> *</b>}</div>
                {q.type === "radio" || q.type === "checkbox" ? q.options.map((o, oi) => <div className="mini-choice" key={oi}><span className={q.type === "radio" ? "fake-radio" : "fake-checkbox"} />{o}</div>)
                  : q.type === "dropdown" ? <div className="mini-answer">Select an option <ChevronDown size={14} /></div>
                  : q.type === "paragraph" ? <div className="mini-answer multi">Your answer</div>
                  : <div className="mini-answer">{q.type === "date" ? "dd/mm/yyyy" : q.type === "file" ? "Add file" : "Your answer"}{q.type === "date" && <CalendarDays size={14} />}</div>}
              </div>)}
              <div className="mini-preview-bottom"><span>Section {activeSection + 1} of {sections.length}</span><button className="btn btn-primary" onClick={() => setPreview(true)}>Preview</button></div>
            </div>
            <div className="preview-tip"><Eye size={16} /><span>Preview your form to test navigation and submit responses.</span></div>
          </aside>
        </main>
      )}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  );
}

export default App;
