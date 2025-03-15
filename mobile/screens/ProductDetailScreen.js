import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(product.images[0]);
  const [inventory, setInventory] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isQuickView, setIsQuickView] = useState(false);

  useEffect(() => {
    fetchInventory();
    const inventoryInterval = setInterval(fetchInventory, 30000);
    return () => clearInterval(inventoryInterval);
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await fetch(`https://api.wave-logistics.com/products/${product._id}/inventory`);
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

  const addToCart = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://api.wave-logistics.com/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('userToken')}`
        },
        body: JSON.stringify({
          productId: product._id,
          quantity: quantity
        })
      });
      const data = await response.json();
      navigation.navigate('Cart');
    } catch (err) {
      console.error('Error adding to cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const buyNow = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://api.wave-logistics.com/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('userToken')}`
        },
        body: JSON.stringify({
          items: [{ productId: product._id, quantity: quantity }]
        })
      });
      const data = await response.json();
      navigation.navigate('Tracking', { orderId: data.orderId });
    } catch (err) {
      console.error('Error creating order:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: selectedImage?.url }}
          style={styles.mainImage}
          defaultSource={require('../assets/placeholder.png')}
        />
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailScroll}
        >
          {product.images.map((image, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedImage(image)}
              style={[styles.thumbnailContainer, selectedImage === image && styles.selectedThumbnail]}
            >
              <Image 
                source={{ uri: image.url }}
                style={styles.thumbnail}
                defaultSource={require('../assets/placeholder.png')}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.price}>${product.price.toFixed(2)}</Text>
        <Text style={styles.description}>{product.description}</Text>

        {inventory && (
          <View style={styles.inventoryContainer}>
            <Ionicons name="cube-outline" size={24} color={inventory.inStock ? "#4CAF50" : "#f44336"} />
            <Text style={[styles.inventoryText, !inventory.inStock && styles.outOfStock]}>
              {inventory.inStock ? `${inventory.quantity} in stock` : 'Out of stock'}
            </Text>
          </View>
        )}

        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => quantity > 1 && setQuantity(q => q - 1)}
          >
            <Ionicons name="remove" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => inventory && quantity < inventory.quantity && setQuantity(q => q + 1)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.shippingInfo}>
          <Ionicons name="airplane-outline" size={24} color="#2196F3" />
          <View style={styles.shippingDetails}>
            <Text style={styles.shippingTitle}>Fast Shipping</Text>
            <Text style={styles.shippingText}>Estimated delivery: 2-3 business days</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.addToCartButton]}
            onPress={addToCart}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={24} color="#fff" />
                <Text style={styles.buttonText}>Add to Cart</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.buyNowButton]}
            onPress={buyNow}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Buy Now</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inventoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8
  },
  inventoryText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#4CAF50'
  },
  outOfStock: {
    color: '#f44336'
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  quantityButton: {
    backgroundColor: '#2196F3',
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 15
  },
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  imageContainer: {
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  mainImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
    borderRadius: 10
  },
  thumbnailScroll: {
    marginTop: 15
  },
  thumbnailContainer: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedThumbnail: {
    borderColor: '#2196F3'
  },
  thumbnail: {
    width: 60,
    height: 60
  },
  detailsContainer: {
    padding: 20
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10
  },
  price: {
    fontSize: 20,
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 15
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20
  },
  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  shippingDetails: {
    marginLeft: 15
  },
  shippingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5
  },
  shippingText: {
    color: '#666'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row'
  },
  addToCartButton: {
    backgroundColor: '#4CAF50',
    marginRight: 10
  },
  buyNowButton: {
    backgroundColor: '#2196F3'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10
  }
}));