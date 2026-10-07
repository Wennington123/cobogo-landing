const TIME_ZONE = "America/Sao_Paulo";

const WEEK = [
  { name: "domingo", open: 12 * 60, close: 17 * 60 },
  { name: "segunda", open: null, close: null },
  { name: "terça", open: 18 * 60, close: 23 * 60 },
  { name: "quarta", open: 18 * 60, close: 23 * 60 },
  { name: "quinta", open: 18 * 60, close: 23 * 60 },
  { name: "sexta", open: 18 * 60, close: 25 * 60 },
  { name: "sábado", open: 12 * 60, close: 25 * 60 },
];

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(value.hour);
  const minute = Number(value.minute);

  return {
    weekday: WEEKDAY_INDEX[value.weekday],
    minutes: hour * 60 + minute,
  };
}

function formatClock(minutes) {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return minute === 0 ? `${hour}h` : `${hour}h${String(minute).padStart(2, "0")}`;
}

function openWindow(dayIndex) {
  return WEEK[dayIndex].open === null ? null : WEEK[dayIndex];
}

function findCurrentWindow(now) {
  const today = openWindow(now.weekday);

  if (today && now.minutes >= today.open && now.minutes < today.close) {
    return today;
  }

  const yesterday = openWindow((now.weekday + 6) % 7);

  if (yesterday && yesterday.close > 24 * 60 && now.minutes < yesterday.close - 24 * 60) {
    return yesterday;
  }

  return null;
}

function findNextOpening(now) {
  for (let step = 0; step <= 7; step += 1) {
    const dayIndex = (now.weekday + step) % 7;
    const window = openWindow(dayIndex);

    if (!window) continue;
    if (step === 0 && now.minutes >= window.open) continue;

    if (step === 0) return { window, label: "hoje" };
    if (step === 1) return { window, label: "amanhã" };
    return { window, label: window.name };
  }

  return null;
}

function describeStatus() {
  const now = localParts();
  const current = findCurrentWindow(now);

  if (current) {
    return { open: true, text: `Aberto agora · fecha às ${formatClock(current.close)}` };
  }

  const next = findNextOpening(now);

  if (!next) {
    return { open: false, text: "Fechado" };
  }

  return {
    open: false,
    text: `Fechado · abre ${next.label} às ${formatClock(next.window.open)}`,
  };
}

function renderStatus() {
  const container = document.querySelector("[data-status]");
  const label = document.querySelector("[data-status-text]");
  if (!container || !label) return;

  const status = describeStatus();
  label.textContent = status.text;
  container.classList.toggle("status--closed", !status.open);
  container.hidden = false;
}

function renderToday() {
  const node = document.querySelector("[data-hoje]");
  if (!node) return;

  const now = new Date();
  node.textContent = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  node.setAttribute("datetime", todayValue(now));
}

function todayValue(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatLongDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatHour(value) {
  const [hour, minute] = value.split(":").map(Number);
  return minute === 0 ? `${hour}h` : `${hour}h${String(minute).padStart(2, "0")}`;
}

const FIELDS = [
  {
    input: "[name='data']",
    error: "#e-data",
    invalid: () => "Escolha a data.",
    test: (value) =>
      value && value >= todayValue() ? null : "Escolha uma data de hoje em diante.",
  },
  {
    input: "[name='hora']",
    error: "#e-hora",
    invalid: () => "Escolha a hora.",
    test: (value) => (value ? null : "Escolha a hora que fica melhor."),
  },
  {
    input: "[name='pessoas']",
    error: "#e-pessoas",
    invalid: () => "Diga quantas pessoas vêm.",
    test: (value) => (value ? null : "Diga quantas pessoas vêm."),
  },
  {
    input: "[name='nome']",
    error: "#e-nome",
    invalid: () => "Escreva o nome de quem reserva.",
    test: (value) => {
      const name = value.trim();
      if (!name) return "Escreva o nome de quem reserva.";
      if (name.length < 3) return "O nome está curto demais.";
      return null;
    },
  },
  {
    input: "[name='telefone']",
    error: "#e-fone",
    invalid: () => "Deixe um telefone para confirmarmos.",
    test: (value) => {
      const digits = value.replace(/\D/g, "");
      if (!digits) return "Deixe um telefone para confirmarmos.";
      if (digits.length < 10) return "Telefone com DDD, por favor.";
      return null;
    },
  },
];

function clearFieldError(field, form) {
  const input = form.querySelector(field.input);
  const error = form.querySelector(field.error);
  input.removeAttribute("aria-invalid");
  input.removeAttribute("aria-describedby");
  error.hidden = true;
  error.textContent = "";
}

function showFieldError(field, form, message) {
  const input = form.querySelector(field.input);
  const error = form.querySelector(field.error);
  const errorId = error.id;

  error.textContent = message;
  error.hidden = false;
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", errorId);
}

function validate(form) {
  const failures = [];

  for (const field of FIELDS) {
    const input = form.querySelector(field.input);
    const message = field.test(input.value);

    if (message) {
      showFieldError(field, form, message);
      failures.push({ input, message });
    } else {
      clearFieldError(field, form);
    }
  }

  return failures;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function collectValues(form) {
  return {
    data: form.querySelector("[name='data']").value,
    hora: form.querySelector("[name='hora']").value,
    pessoas: form.querySelector("[name='pessoas']").value,
    nome: form.querySelector("[name='nome']").value.trim(),
    telefone: form.querySelector("[name='telefone']").value.trim(),
  };
}

function setLoading(button, loading) {
  if (loading) {
    button.dataset.loading = "true";
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.dataset.label = button.textContent;
    button.textContent = "Enviando pedido";
    return;
  }

  delete button.dataset.loading;
  button.disabled = false;
  button.removeAttribute("aria-busy");
  if (button.dataset.label) button.textContent = button.dataset.label;
}

function setUpReservation() {
  const form = document.querySelector("[data-form]");
  const done = document.querySelector("[data-done]");
  const failed = document.querySelector("[data-failed]");
  const summary = document.querySelector("[data-form-summary]");
  const submit = document.querySelector("[data-submit]");
  const dateInput = form?.querySelector("[name='data']");

  if (!form || !done || !failed) return;

  dateInput.min = todayValue();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    summary.hidden = true;
    summary.textContent = "";

    const failures = validate(form);

    if (failures.length > 0) {
      summary.textContent =
        failures.length === 1
          ? "Falta um campo para a reserva seguir."
          : `Faltam ${failures.length} campos para a reserva seguir.`;
      summary.hidden = false;
      failures[0].input.focus();
      return;
    }

    if (!navigator.onLine) {
      form.hidden = true;
      failed.hidden = false;
      failed.focus();
      return;
    }

    setLoading(submit, true);
    const values = collectValues(form);
    await sleep(900);
    setLoading(submit, false);

    done.querySelector("[data-done-nome]").textContent = values.nome;
    done.querySelector("[data-done-quando]").textContent =
      `${formatLongDate(values.data)}, às ${formatHour(values.hora)}`;
    done.querySelector("[data-done-pessoas]").textContent =
      values.pessoas === "1" ? "1 pessoa" : `${values.pessoas} pessoas`;
    done.querySelector("[data-done-fone]").textContent = values.telefone;

    form.hidden = true;
    failed.hidden = true;
    done.hidden = false;
    done.focus();
  });

  for (const field of FIELDS) {
    const input = form.querySelector(field.input);
    input.addEventListener("input", () => {
      if (input.hasAttribute("aria-invalid")) clearFieldError(field, form);
    });
  }

  document.querySelector("[data-retry]").addEventListener("click", () => {
    failed.hidden = true;
    form.hidden = false;
    submit.focus();
  });

  document.querySelector("[data-reset]").addEventListener("click", () => {
    done.hidden = true;
    failed.hidden = true;
    form.hidden = false;
    form.reset();
    for (const field of FIELDS) clearFieldError(field, form);
    summary.hidden = true;
    dateInput.focus();
  });
}

function setUpReveal() {
  const targets = document.querySelectorAll("[data-reveal]");
  if (targets.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    for (const target of targets) target.classList.add("is-visible");
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, index) => {
          entry.target.style.transitionDelay = `${Math.min(index, 4) * 60}ms`;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
  );

  for (const target of targets) observer.observe(target);
}

function startClock() {
  renderStatus();
  renderToday();
  window.setInterval(() => {
    renderStatus();
    renderToday();
  }, 60_000);
}

startClock();
setUpReservation();
setUpReveal();
