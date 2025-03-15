import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const menuItems = [
    { title: 'Shop', icon: 'cart', screen: 'Shop', color: '#2196F3' },
    { title: 'My Cart', icon: 'cart-outline', screen: 'Cart', color: '#4CAF50' },
    { title: 'Track Shipment', icon: 'map', screen: 'Tracking', color: '#FF9800' },
    { title: 'My Orders', icon: 'cube', screen: 'Orders', color: '#9C27B0' },
    { title: 'New Shipment', icon: 'add-circle', screen: 'NewShipment', color: '#F44336' },
    { title: 'Reviews', icon: 'star', screen: 'Reviews', color: '#FFC107' },
    { title: 'Support', icon: 'help-circle', screen: 'Support', color: '#607D8B' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <Text style={styles.subGreeting}>Track and manage your shipments</Text>
      </View>

      <View style={styles.menuGrid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons name={item.icon} size={32} color={item.color} />
            <Text style={[styles.menuItemText, { color: item.color }]}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {/* Add recent activity items here */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#2196F3',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subGreeting: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  menuItemText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  recentActivity: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
});