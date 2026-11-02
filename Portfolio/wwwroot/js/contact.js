// Contact page: copy-to-clipboard buttons and the message form.

import { qs, qsa, toast } from './util.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / insecure origins: fall back to a hidden textarea.
    const area = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(area);
    area.select();
    const ok = document.execCommand?.('copy') ?? false;
    area.remove();
    return ok;
  }
}

function initCopy() {
  for (const button of qsa('.copy[data-copy]')) {
    button.addEventListener('click', async () => {
      const ok = await copyText(button.dataset.copy);
      toast(ok ? 'Copied to clipboard' : 'Could not copy — select the text instead', { error: !ok });
      if (!ok) return;
      button.classList.add('is-copied');
      const icon = qs('use', button);
      icon?.setAttribute('href', '#i-check');
      setTimeout(() => {
        button.classList.remove('is-copied');
        icon?.setAttribute('href', '#i-copy');
      }, 1400);
    });
  }
}

function initForm() {
  const form = qs('[data-contact-form]');
  if (!form) return;

  const status = qs('.form__status', form);
  const submit = qs('button[type="submit"]', form);
  const fields = {
    name: form.elements.name,
    email: form.elements.email,
    subject: form.elements.subject,
    message: form.elements.message,
  };

  const rules = {
    name: (value) => (value.trim() ? '' : 'Please tell me your name.'),
    email: (value) => (EMAIL.test(value.trim()) ? '' : 'Please enter a valid e-mail address.'),
    subject: (value) => (value.trim() ? '' : 'Please add a short subject.'),
    message: (value) => (value.trim().length >= 10 ? '' : 'Please write at least a few words.'),
  };

  function setError(name, message) {
    const input = fields[name];
    const error = qs(`#cf-${name}-error`, form);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message) input.setAttribute('aria-describedby', error.id);
    else input.removeAttribute('aria-describedby');
    error.textContent = message;
    error.hidden = !message;
  }

  function validate() {
    let firstInvalid = null;
    for (const name of Object.keys(fields)) {
      const message = rules[name](fields[name].value);
      setError(name, message);
      firstInvalid ??= message ? fields[name] : null;
    }
    return firstInvalid;
  }

  function say(message, { error = false } = {}) {
    status.textContent = message;
    status.classList.toggle('is-error', error);
    status.hidden = !message;
  }

  for (const name of Object.keys(fields)) {
    fields[name].addEventListener('input', () => {
      if (fields[name].getAttribute('aria-invalid') === 'true') setError(name, rules[name](fields[name].value));
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    say('');
    const invalid = validate();
    if (invalid) {
      invalid.focus();
      return;
    }

    const payload = {
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      subject: fields.subject.value.trim(),
      message: fields.message.value.trim(),
      website: form.elements.website.value,
    };

    submit.disabled = true;
    submit.classList.add('is-sending');
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        form.reset();
        say('Thank you! Your message is on its way.');
        toast('Message sent');
      } else if (response.status === 400) {
        const { errors = {} } = await response.json().catch(() => ({}));
        for (const [name, message] of Object.entries(errors)) if (fields[name]) setError(name, message);
        say('Please check the highlighted fields.', { error: true });
      } else if (response.status === 429) {
        say('Too many attempts — please try again in a minute.', { error: true });
      } else if (response.status === 501) {
        // The server has no mail account configured: hand the message to the visitor's mail app instead.
        const mailto = `mailto:${qs('.info__value[href^="mailto:"]')?.textContent.trim() ?? ''}` +
          `?subject=${encodeURIComponent(payload.subject)}` +
          `&body=${encodeURIComponent(`${payload.message}\n\n— ${payload.name} (${payload.email})`)}`;
        say('Opening your mail app…');
        location.href = mailto;
      } else {
        say('Something went wrong. Please try again later.', { error: true });
      }
    } catch {
      say('You seem to be offline. Please try again later.', { error: true });
    } finally {
      submit.disabled = false;
      submit.classList.remove('is-sending');
    }
  });
}

export function initContact() {
  initCopy();
  initForm();
}
