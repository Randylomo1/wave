import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

class WebSocketService {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second delay
        this.isConnecting = false;
        this.networkListener = null;
        this.appStateListener = null;
        this.setupNetworkListener();
        this.setupAppStateListener();
    }
    
    setupNetworkListener() {
        this.networkListener = NetInfo.addEventListener(state => {
            console.log('Network state changed:', state.isConnected);
            if (state.isConnected && !this.socket?.connected && !this.isConnecting) {
                this.connect();
            }
        });
    }
    
    setupAppStateListener() {
        this.appStateListener = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && !this.socket?.connected && !this.isConnecting) {
                this.connect();
            } else if (nextAppState === 'background') {
                // Optionally disconnect when app goes to background to save battery
                // this.disconnect();
            }
        });
    }

    async connect() {
        if (this.isConnecting) return false;
        this.isConnecting = true;
        
        try {
            // Check network connectivity first
            const networkState = await NetInfo.fetch();
            if (!networkState.isConnected) {
                console.log('Cannot connect: No network connection');
                this.isConnecting = false;
                return false;
            }
            
            // Get and parse token safely
            let token;
            try {
                const rawToken = await AsyncStorage.getItem('userToken');
                if (!rawToken) throw new Error('No authentication token found');
                
                // Handle potential encrypted token format
                if (rawToken.startsWith('{')) {
                    const tokenData = JSON.parse(rawToken);
                    // Assuming there's a decryption method available
                    token = tokenData.token || tokenData;
                } else {
                    token = rawToken;
                }
            } catch (tokenError) {
                console.error('Token retrieval/parsing error:', tokenError);
                this.isConnecting = false;
                return false;
            }

            // Create socket with error handling
            this.socket = io('https://api.wave-logistics.com', {
                auth: { token },
                transports: ['websocket'],
                reconnection: true,
                reconnectionDelay: this.reconnectDelay,
                reconnectionDelayMax: 5000,
                timeout: 10000,
                reconnectionAttempts: this.maxReconnectAttempts
            });

            this.setupEventListeners();
            this.isConnecting = false;
            return true;
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.isConnecting = false;
            return false;
        }
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('WebSocket disconnected:', reason);
            this.handleDisconnect();
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.handleConnectionError();
        });

        this.socket.on('shipment_update', (data) => {
            this.handleShipmentUpdate(data);
        });
    }

    handleDisconnect(reason) {
        // Don't attempt to reconnect if the disconnection was intentional
        if (reason === 'io client disconnect' || reason === 'io server disconnect') {
            return;
        }
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
            setTimeout(() => this.connect(), delay);
        }
    }

    handleConnectionError() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
            setTimeout(() => this.connect(), delay);
        }
    }

    subscribeToShipment(trackingNumber) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('subscribe_shipment', { trackingNumber });
        }
    }

    unsubscribeFromShipment(trackingNumber) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('unsubscribe_shipment', { trackingNumber });
        }
    }

    handleShipmentUpdate(data) {
        // Dispatch update to event listeners
        this.emit('shipmentUpdate', data);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.reconnectAttempts = 0;
    }
    
    cleanup() {
        this.disconnect();
        
        // Remove event listeners
        if (this.networkListener) {
            this.networkListener();
            this.networkListener = null;
        }
        
        if (this.appStateListener) {
            this.appStateListener.remove();
            this.appStateListener = null;
        }
        
        // Clear all listeners
        this.listeners = {};
    }

    // Event emitter implementation
    listeners = {};

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => callback(data));
    }
}

export default new WebSocketService();