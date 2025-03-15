import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateInputs = () => {
    if (!email || !password) {
      setError('Email and password are required');
      return false;
    }
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
      setError('Password must be at least 8 characters long and contain uppercase, lowercase, number and special character');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    setError('');
    
    if (!validateInputs()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('https://api.wave-logistics.com/auth/login', {
        email: email.trim().toLowerCase(),
        password,
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
          manufacturer: Platform.constants?.manufacturer
        }
      }, {
        headers: {
          'X-Device-ID': await AsyncStorage.getItem('deviceId') || crypto.randomUUID(),
          'X-App-Version': '1.0.0'
        }
      });

      if (response.data.token && response.data.user) {
        if (!response.data.user.isEmailVerified) {
          setError('Please verify your email before logging in');
          return;
        }
        // Encrypt sensitive data before storing
        const encryptData = async (data) => {
          const key = await crypto.getRandomValues(new Uint8Array(32));
          const iv = await crypto.getRandomValues(new Uint8Array(12));
          const encoder = new TextEncoder();
          const encoded = encoder.encode(data);
          
          const cryptoKey = await crypto.subtle.importKey(
            'raw', key, { name: 'AES-GCM' }, false, ['encrypt']
          );
          
          const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv }, cryptoKey, encoded
          );
          
          return {
            encrypted: Array.from(new Uint8Array(encrypted)),
            key: Array.from(key),
            iv: Array.from(iv)
          };
        };

        const encryptedToken = await encryptData(response.data.token);
        const encryptedUser = await encryptData(JSON.stringify(response.data.user));
        
        await AsyncStorage.setItem('userToken', JSON.stringify(encryptedToken));
        await AsyncStorage.setItem('userData', JSON.stringify(encryptedUser));
        await AsyncStorage.setItem('lastLoginTime', Date.now().toString());
        await AsyncStorage.setItem('deviceId', crypto.randomUUID());
        navigation.replace('Home');
      }
    } catch (err) {
      let errorMessage = err.response?.data?.message || 'An error occurred during login';
      if (err.response?.status === 429) {
        errorMessage = 'Too many login attempts. Please try again later.';
      }
      setError(errorMessage);
      console.error('Login error:', err);
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/icon.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>Wave Logistics</Text>
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={handleLogin} 
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#2196F3',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    marginBottom: 15,
  },
}));