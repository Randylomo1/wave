import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import jwtDecode from 'jwt-decode';

class AuthMiddleware {
    constructor() {
        this.biometricEnabled = false;
        this.deviceId = null;
        this.initializeDeviceId();
    }

    async initializeDeviceId() {
        try {
            let deviceId = await AsyncStorage.getItem('deviceId');
            if (!deviceId) {
                deviceId = await Crypto.digestStringAsync(
                    Crypto.CryptoDigestAlgorithm.SHA256,
                    `${Device.deviceName}-${Device.modelName}-${Date.now()}`
                );
                await AsyncStorage.setItem('deviceId', deviceId);
            }
            this.deviceId = deviceId;
        } catch (error) {
            console.error('Failed to initialize device ID:', error);
        }
    }

    async enableBiometric() {
        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();

            if (compatible && enrolled) {
                this.biometricEnabled = true;
                await AsyncStorage.setItem('biometricEnabled', 'true');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Biometric setup error:', error);
            return false;
        }
    }

    async authenticateWithBiometric() {
        if (!this.biometricEnabled) return true;

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to continue',
                fallbackLabel: 'Use passcode',
                disableDeviceFallback: false,
                cancelLabel: 'Cancel'
            });
            return result.success;
        } catch (error) {
            console.error('Biometric authentication error:', error);
            return false;
        }
    }

    async storeAuthToken(token) {
        try {
            const tokenHash = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                token
            );
            await SecureStore.setItemAsync('authToken', token);
            await SecureStore.setItemAsync('tokenHash', tokenHash);
            await AsyncStorage.setItem('isAuthenticated', 'true');
            return true;
        } catch (error) {
            console.error('Token storage error:', error);
            return false;
        }
    }

    async validateToken(token) {
        try {
            const decoded = jwtDecode(token);
            const currentTime = Date.now() / 1000;

            if (decoded.exp < currentTime) {
                await this.clearAuth();
                return false;
            }

            const storedHash = await SecureStore.getItemAsync('tokenHash');
            const currentHash = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                token
            );

            return storedHash === currentHash;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    async clearAuth() {
        try {
            await SecureStore.deleteItemAsync('authToken');
            await SecureStore.deleteItemAsync('tokenHash');
            await AsyncStorage.removeItem('isAuthenticated');
            return true;
        } catch (error) {
            console.error('Auth clearing error:', error);
            return false;
        }
    }

    getAuthHeaders() {
        return {
            'X-Device-ID': this.deviceId,
            'X-Platform': Platform.OS,
            'X-App-Version': Device.appVersion || '1.0.0',
            'X-Device-Model': Device.modelName
        };
    }
}

export default new AuthMiddleware();