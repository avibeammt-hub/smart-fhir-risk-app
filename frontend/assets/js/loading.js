const Loading = (() => {

  /**
   * Activa el loading de un botón.
   *
   * @param {HTMLElement|string} buttonOrId
   * @param {string} message
   */
  function showButton(buttonOrId, message = 'Procesando...') {
    const button = resolveElement(buttonOrId);

    if (!button) {
      console.error('Loading.showButton: botón no encontrado');
      return;
    }

    // Evita guardar varias veces el contenido original
    if (!button.dataset.loadingOriginalHtml) {
      button.dataset.loadingOriginalHtml = button.innerHTML;
    }

    button.disabled = true;
    button.classList.add('loading-button');
    button.setAttribute('aria-busy', 'true');

    button.innerHTML = `
      <span class="loading-button-content">
        <span class="loading-spinner" aria-hidden="true"></span>
        <span>${escapeHtml(message)}</span>
      </span>
    `;
  }

  /**
   * Retira el loading y restaura el botón.
   *
   * @param {HTMLElement|string} buttonOrId
   */
  function hideButton(buttonOrId) {
    const button = resolveElement(buttonOrId);

    if (!button) {
      console.error('Loading.hideButton: botón no encontrado');
      return;
    }

    button.disabled = false;
    button.classList.remove('loading-button');
    button.removeAttribute('aria-busy');

    if (button.dataset.loadingOriginalHtml) {
      button.innerHTML = button.dataset.loadingOriginalHtml;
      delete button.dataset.loadingOriginalHtml;
    }
  }

  /**
   * Determina si un botón está cargando.
   *
   * @param {HTMLElement|string} buttonOrId
   * @returns {boolean}
   */
  function isButtonLoading(buttonOrId) {
    const button = resolveElement(buttonOrId);

    return Boolean(
      button &&
      button.classList.contains('loading-button')
    );
  }

  function resolveElement(elementOrId) {
    if (typeof elementOrId === 'string') {
      return document.getElementById(elementOrId);
    }

    return elementOrId;
  }

  function escapeHtml(value) {
    const element = document.createElement('div');
    element.textContent = String(value);
    return element.innerHTML;
  }

  return {
    showButton,
    hideButton,
    isButtonLoading
  };

})();

window.Loading = Loading;