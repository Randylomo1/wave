import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';

class ErrorHandlingService {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.isRefreshing = false;
        this.refreshSubscribers = [];
        this.networkStatus = { isConnected: true };
        this.setupNetworkListener();
        this.setupAxiosInterceptors();
    }

    setupNetworkListener() {
        NetInfo.addEventListener(state => {
            this.networkStatus = state;
            console.log('Network status changed:', state.isConnected);
        });
    }

    setupAxiosInterceptors() {
        axios.interceptors.response.use(
            response => response,
            async error => {
                const originalRequest = error.config;
                originalRequest.retryCount = originalRequest.retryCount || 0;

                // Handle token refresh
                if (error.response?.status === 401 && !originalRequest._retry) {
                    if (this.isRefreshing) {
                        // If already refreshing, wait for the new token
                        try {
                            const token = await new Promise((resolve, reject) => {
                                this.refreshSubscribers.push({ resolve, reject });
                            });
                            originalRequest.headers['Authorization'] = `Bearer ${token}`;
                            return axios(originalRequest);
                        } catch (subscribeError) {
                            return Promise.reject(this.enhanceError(subscribeError));
                        }
                    }

                    originalRequest._retry = true;
                    this.isRefreshing = true;

                    try {
                        // Check if we have a refresh token
                        const refreshToken = await AsyncStorage.getItem('refreshToken');
                        if (!refreshToken) {
                            throw new Error('No refresh token available');
                        }

                        // Check network connectivity before attempting refresh
                        if (!this.networkStatus.isConnected) {
                            throw new Error('No network connection available');
                        }

                        const response = await axios.post('https://api.wave-logistics.com/auth/refresh', {
                            refreshToken
                        });
                        
                        const { token } = response.data;
                        await AsyncStorage.setItem('userToken', token);
                        
                        // Notify all subscribers about the new token
                        this.refreshSubscribers.forEach(callback => callback.resolve(token));
                        this.refreshSubscribers = [];
                        this.isRefreshing = false;
                        
                        originalRequest.headers['Authorization'] = `Bearer ${token}`;
                        return axios(originalRequest);
                    } catch (refreshError) {
                        // Notify subscribers about the error
                        this.refreshSubscribers.forEach(callback => callback.reject(refreshError));
                        this.refreshSubscribers = [];
                        this.isRefreshing = false;
                        
                        // Clear auth tokens on refresh failure
                        await AsyncStorage.removeItem('userToken');
                        await AsyncStorage.removeItem('refreshToken');
                        return Promise.reject(this.enhanceError(refreshError));
                    }
                }

                // Handle retryable errors
                if (this.isRetryable(error) && originalRequest.retryCount < this.maxRetries) {
                    // Check network connectivity before retrying
                    if (!this.networkStatus.isConnected) {
                        return Promise.reject(this.enhanceError(new Error('No network connection available')));
                    }
                    
                    originalRequest.retryCount += 1;
                    const delayTime = this.retryDelay * Math.pow(2, originalRequest.retryCount - 1); // Exponential backoff
                    await this.delay(delayTime);
                    return axios(originalRequest);
                }

                return Promise.reject(this.enhanceError(error));
            }
        );
    }

    isRetryable(error) {
        return (
            error.response?.status >= 500 ||
            error.code === 'ECONNABORTED' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ECONNRESET' ||
            error.message === 'Network Error' ||
            !error.response
        ) && this.networkStatus.isConnected; // Only retry if we have network connectivity
    }

    enhanceError(error) {
        const enhancedError = {
            ...error,
            userMessage: this.getUserFriendlyMessage(error),
            timestamp: new Date().toISOString(),
            retryAttempts: error.config?.retryCount || 0
        };

        this.logError(enhancedError);
        return enhancedError;
    }

    getUserFriendlyMessage(error) {
        if (!error.response) {
            return 'Unable to connect to the server. Please check your internet connection.';
        }

        switch (error.response.status) {
            case 400:
                return 'The request was invalid. Please check your input and try again.';
            case 401:
                return 'Your session has expired. Please log in again.';
            case 403:
                return 'You do not have permission to perform this action.';
            case 404:
                return 'The requested resource was not found.';
            case 429:
                return 'Too many requests. Please try again later.';
            case 500:
                return 'An unexpected error occurred. Our team has been notified.';
            default:
                return 'Something went wrong. Please try again later.';
        }
    }

    async logError(error) {
        try {
            const errorLog = {
                message: error.message,
                userMessage: error.userMessage,
                stack: error.stack,
                timestamp: error.timestamp,
                url: error.config?.url,
                method: error.config?.method,
                status: error.response?.status,
                retryAttempts: error.retryAttempts,
                networkConnected: this.networkStatus.isConnected,
                networkType: this.networkStatus.type,
                appState: 'active' // Could be enhanced with AppState from react-native
            };

            // Store error locally for debugging - with error handling for JSON parsing
            let errors = [];
            try {
                const storedErrors = await AsyncStorage.getItem('error_logs');
                if (storedErrors) {
                    errors = JSON.parse(storedErrors);
                }
            } catch (parseError) {
                console.error('Error parsing stored logs:', parseError);
                // If parsing fails, start with a fresh array
            }
            
            errors.push(errorLog);
            await AsyncStorage.setItem('error_logs', JSON.stringify(errors.slice(-50))); // Keep last 50 errors

            // Send to remote logging service only if we have network connectivity
            if (error.response?.status >= 500 && this.networkStatus.isConnected) {
                try {
                    await axios.post('https://api.wave-logistics.com/logs/error', errorLog, {
                        timeout: 5000 // Set a timeout for the logging request
                    });
                } catch (remoteLogError) {
                    console.error('Remote error logging failed:', remoteLogError);
                    // Store that we failed to send this log
                    errorLog.remoteLogFailed = true;
                    // We could implement a retry mechanism here
                }
            }
        } catch (logError) {
            console.error('Error logging failed:', logError);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    clearErrorLogs() {
        return AsyncStorage.removeItem('error_logs');
    }
}

export default new ErrorHandlingService();