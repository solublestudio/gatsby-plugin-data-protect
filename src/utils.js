export const getStoredValue = key => (window.localStorage.getItem(key));

export const storeValue = (key, value) => (window.localStorage.setItem(key, value));

export const removeValue = (key = null) => (key ? window.localStorage.removeItem(key) : window.localStorage.clear());

export const makeLoginCall = (url, params, successCallback, errorCallback) => {
    fetch(url, {
        method: 'POST',
        body: JSON.stringify(params),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(res => res.json())
    .catch(errorCallback)
    .then(successCallback);
}

export const getNewProps = (props, sensitiveKeys) => {
    let newProps = { ...props };
    
    Object.keys(sensitiveKeys).forEach(dataKey => {
        const sensitiveData = JSON.parse(getStoredValue(sensitiveKeys[dataKey]));
        newProps.pageContext[dataKey] = sensitiveData;
    });

    return newProps;
}

export const dispatchEvent = (dom, eventName, data = {}) => {
    const newEvent = new CustomEvent(eventName, data);
    dom.dispatchEvent(newEvent);
};

export const hookLoginForm = (loginUrl, version) => {
    const form = document.getElementById('data-protect-form');
    if (!form) {
        return;
    }

    form.addEventListener('submit', function(e) {
        dispatchEvent(form, 'loading');
        e.preventDefault();

        if (form.elements && form.elements.email && form.elements.email.value) {
            makeLoginCall(
                loginUrl,
                { email: form.elements.email.value, version },
                response => {
                    if (!response || response.msg == 'forbidden') {
                        dispatchEvent(form, 'error', response);
                    } else {
                        dispatchEvent(form, 'success', response);
                    }
                },
                error => {
                    dispatchEvent(form, 'error', { msg: 'error' });
                }
            );
        }
    });
}