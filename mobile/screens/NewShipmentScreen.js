import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NewShipmentScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [shipmentDetails, setShipmentDetails] = useState({
    recipientName: '',
    recipientPhone: '',
    recipientEmail: '',
    deliveryAddress: '',
    city: '',
    state: '',
    zipCode: '',
    packageWeight: '',
    packageDimensions: '',
    specialInstructions: ''
  });

  const handleInputChange = (field, value) => {
    setShipmentDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const required = ['recipientName', 'recipientPhone', 'deliveryAddress', 'city', 'state', 'zipCode'];
    return required.every(field => shipmentDetails[field].trim());
  };

  const createShipment = async () => {
    if (!validateForm()) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://api.wave-logistics.com/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('userToken')}`
        },
        body: JSON.stringify(shipmentDetails)
      });
      const data = await response.json();
      navigation.navigate('Tracking', { shipmentId: data.shipmentId });
    } catch (err) {
      console.error('Error creating shipment:', err);
      alert('Failed to create shipment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Recipient Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Recipient Name *"
          value={shipmentDetails.recipientName}
          onChangeText={(value) => handleInputChange('recipientName', value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number *"
          value={shipmentDetails.recipientPhone}
          onChangeText={(value) => handleInputChange('recipientPhone', value)}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          value={shipmentDetails.recipientEmail}
          onChangeText={(value) => handleInputChange('recipientEmail', value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Street Address *"
          value={shipmentDetails.deliveryAddress}
          onChangeText={(value) => handleInputChange('deliveryAddress', value)}
        />
        <TextInput
          style={styles.input}
          placeholder="City *"
          value={shipmentDetails.city}
          onChangeText={(value) => handleInputChange('city', value)}
        />
        <TextInput
          style={styles.input}
          placeholder="State *"
          value={shipmentDetails.state}
          onChangeText={(value) => handleInputChange('state', value)}
        />
        <TextInput
          style={styles.input}
          placeholder="ZIP Code *"
          value={shipmentDetails.zipCode}
          onChangeText={(value) => handleInputChange('zipCode', value)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Package Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Package Weight (lbs)"
          value={shipmentDetails.packageWeight}
          onChangeText={(value) => handleInputChange('packageWeight', value)}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Package Dimensions (L x W x H)"
          value={shipmentDetails.packageDimensions}
          onChangeText={(value) => handleInputChange('packageDimensions', value)}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Special Instructions"
          value={shipmentDetails.specialInstructions}
          onChangeText={(value) => handleInputChange('specialInstructions', value)}
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity
        style={[styles.createButton, !validateForm() && styles.disabledButton]}
        onPress={createShipment}
        disabled={loading || !validateForm()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="airplane" size={24} color="#fff" />
            <Text style={styles.buttonText}>Create Shipment</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20
  },
  formSection: {
    marginBottom: 25
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  createButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30
  },
  disabledButton: {
    opacity: 0.7
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10
  }
}));