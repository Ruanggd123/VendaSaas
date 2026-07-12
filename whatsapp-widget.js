/**
 * WhatsApp Floating Widget
 * @version 1.0.0
 * @license MIT
 */

(function() {
    // Default configuration
    const defaultConfig = {
        phone: '',
        message: 'Olá, gostaria de mais informações',
        botType: 'rules',
        position: 'right',
        buttonColor: '#25D366',
        greetingMessage: 'Como podemos ajudar?',
        greetingDuration: 3000
    };

    // Merge user config with defaults
    const config = {...defaultConfig, ...(window.whatsappConfig || {})};

    // Create widget elements
    const widget = document.createElement('div');
    widget.style.position = 'fixed';
    widget.style.bottom = '20px';
    widget.style[config.position] = '20px';
    widget.style.zIndex = '9999';

    const button = document.createElement('div');
    button.style.width = '60px';
    button.style.height = '60px';
    button.style.borderRadius = '50%';
    button.style.backgroundColor = config.buttonColor;
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

    const icon = document.createElement('img');
    icon.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NDggNTEyIj48cGF0aCBmaWxsPSJ3aGl0ZSIgZD0iMzkzLjIgMTYxLjhDNDAzLjEgMTI5LjEgMzc1LjggOTUuNiAzNDMuMiA4NS43Yy0zMi41LTkuOS-74uX9iIvPjwvc3ZnPg==';
    icon.style.width = '30px';
    icon.style.height = '30px';

    const bubble = document.createElement('div');
    bubble.style.position = 'absolute';
    bubble.style.bottom = '70px';
    bubble.style[config.position] = '0';
    bubble.style.backgroundColor = 'white';
    bubble.style.padding = '10px 15px';
    bubble.style.borderRadius = '10px';
    bubble.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    bubble.style.maxWidth = '200px';
    bubble.style.display = 'none';
    bubble.textContent = config.greetingMessage;

    button.appendChild(icon);
    widget.appendChild(button);
    widget.appendChild(bubble);
    document.body.appendChild(widget);

    // Show greeting bubble
    setTimeout(() => {
        bubble.style.display = 'block';
        setTimeout(() => {
            bubble.style.display = 'none';
        }, config.greetingDuration);
    }, 500);

    // Handle click
    button.addEventListener('click', () => {
        const encodedMessage = encodeURIComponent(config.message);
        window.open(`https://wa.me/${config.phone}?text=${encodedMessage}`, '_blank');
    });
})();
