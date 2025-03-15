import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebSocketService from '../services/WebSocketService';
import axios from 'axios';

export default function TrackingScreen() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shipmentData, setShipmentData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    WebSocketService.connect();
    return () => {
      if (isSubscribed && trackingNumber) {
        WebSocketService.unsubscribeFromShipment(trackingNumber);
      }
      WebSocketService.disconnect();
    };
  }, [isSubscribed, trackingNumber]);

  useEffect(() => {
    if (shipmentData) {
      WebSocketService.on('shipmentUpdate', handleShipmentUpdate);
      WebSocketService.subscribeToShipment(trackingNumber);
      setIsSubscribed(true);
    }
    return () => {
      WebSocketService.off('shipmentUpdate', handleShipmentUpdate);
    };
  }, [shipmentData, trackingNumber]);

  const handleShipmentUpdate = (update) => {
    setShipmentData(prevData => {
      // Only add to updates array if latestUpdate exists
      const updatedUpdates = update.latestUpdate 
        ? [update.latestUpdate, ...prevData.updates]
        : prevData.updates;
        
      return {
        ...prevData,
        ...update,
        updates: updatedUpdates
      };
    });
  };

  const handleTrackShipment = async () => {
    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.get(`https://api.wave-logistics.com/shipments/${trackingNumber}`);
      setShipmentData(response.data);
      
      if (isSubscribed) {
        WebSocketService.unsubscribeFromShipment(trackingNumber);
      }
      WebSocketService.subscribeToShipment(trackingNumber);
      setIsSubscribed(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch shipment data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    if (trackingNumber.trim()) {
      handleTrackShipment().finally(() => setRefreshing(false));
    } else {
      setRefreshing(false);
      setError('Please enter a tracking number');
    }
  }, [trackingNumber, handleTrackShipment]);

  const renderStatusTimeline = () => {
    return shipmentData?.updates.map((update, index) => (
      <View key={index} style={styles.timelineItem}>
        <View style={styles.timelineDot} />
        <View style={styles.timelineContent}>
          <Text style={styles.timelineDate}>{update.date}</Text>
          <Text style={styles.timelineStatus}>{update.status}</Text>
        </View>
      </View>
    ));
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.searchSection}>
        <TextInput
          style={styles.input}
          placeholder="Enter tracking number"
          value={trackingNumber}
          onChangeText={setTrackingNumber}
        />
        <TouchableOpacity 
          style={styles.trackButton} 
          onPress={handleTrackShipment}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Track</Text>
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {shipmentData && (
        <View style={styles.resultContainer}>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Current Status</Text>
            <Text style={styles.statusText}>{shipmentData.status}</Text>
            <Text style={styles.locationText}>{shipmentData.location}</Text>
            <Text style={styles.deliveryText}>
              Estimated Delivery: {shipmentData.estimatedDelivery}
            </Text>
          </View>

          <View style={styles.timeline}>
            <Text style={styles.timelineTitle}>Shipment Updates</Text>
            {renderStatusTimeline()}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchSection: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    fontSize: 16,
  },
  trackButton: {
    backgroundColor: '#2196F3',
    height: 50,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  resultContainer: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  deliveryText: {
    fontSize: 14,
    color: '#888',
  },
  timeline: {
    marginTop: 20,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    marginRight: 15,
    marginTop: 5,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDate: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  timelineStatus: {
    fontSize: 16,
    color: '#333',
  },
}));