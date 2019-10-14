import React, { useState, useEffect, useRef, cloneElement } from 'react';
import { navigate } from 'gatsby';

import { 
    getStoredValue, 
    storeValue, 
    removeValue,
    makeLoginCall,
    getNewProps,
    hookLoginForm
} from './utils';

const hasData = sensitiveKeys => {
    const uuids = Object.values(sensitiveKeys);
    return uuids.length && getStoredValue(uuids[0]) ? true : false;
}

const timeoutNavigate = (path = null, startTime = 0) => {
    const endTime = Date.now();
    const difference = endTime - startTime;

    setTimeout(() => {
        navigate(path, { replace: false });
    }, Math.max(difference, 500));
}

export default ({ children, ...props }) => {
    const [ data, setData ] = useState(null);
    const prevPath = usePrevious(props.path);
    
    useEffect(() => {
        if (!props.pageContext.dataProtectValues) {
            setData(props);
            return;
        }

        const { 
            isLoadingPage, 
            loadingPath, 
            sensitiveKeys,
            loginPath,
            loginUrl,
            version,
            publicUrl
        } = props.pageContext.dataProtectValues;

        setTimeout(hookLoginForm.bind(null, loginUrl, version), 0);

        if (props.pageContext.dataProtectValues.isLoginPage) {
            if (!data) {
                setData(props);
            }
            
            return;
        }
        
        if (hasData(sensitiveKeys)) {
            setData(getNewProps(props, sensitiveKeys));
            return;
        }
        
        if (!isLoadingPage) {
            storeValue('data-protect-redirect', props.path);
            navigate(loadingPath, { replace: false });
            return;
        } else if (!data) {
            setData(props);
        }
        
        const token = isLoadingPage && props.token && props.token !== 'loading' ? props.token : getStoredValue('data-protect-token');
        const startTime = Date.now();
        
        if ((!isLoadingPage && !prevPath) || !token) {
            timeoutNavigate(loginPath, startTime);
            return;
        }

        const reset = () => {
            removeValue();
            timeoutNavigate(loginPath, startTime);
        }

        makeLoginCall(
            loginUrl, 
            { token, version },
            response => {
                if (!response || !response.filename) {
                    reset();
                    return;
                }

                fetch(`${publicUrl}/${response.filename}.json`)
                    .then(res => res.json())
                    .catch(error => {
                        reset();
                        return;
                    })
                    .then(response => {
                        const redirectPath = getStoredValue('data-protect-redirect');
                        removeValue();

                        Object.keys(response).forEach(key => {
                            storeValue(key, JSON.stringify(response[key]));
                        });

                        storeValue('data-protect-token', token);

                        if (redirectPath) {
                            storeValue('data-protect-redirect', redirectPath);
                            timeoutNavigate(redirectPath, startTime);
                        } else {
                            reset();
                        }
                    });
            },
            error => {
                reset();
                return;
            });
    }, [ props.path ]);
    
    return (
        <div style={{ opacity: data ? 1 : 0 }}>
            {data ? cloneElement(children, data) : children}
        </div>
    );
};

function usePrevious(value) {
    const ref = useRef();

    useEffect(() => {
      ref.current = value;
    }, [value]);

    return ref.current;
}