import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ReviewsScreen() {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mockReviews = [
    {
      id: 1,
      user: 'John D.',
      rating: 5,
      date: '2024-02-15',
      comment: 'Excellent service! My package arrived ahead of schedule.',
      source: 'app'
    },
    {
      id: 2,
      user: 'Sarah M.',
      rating: 4,
      date: '2024-02-14',
      comment: 'Very reliable shipping service. Will use again!',
      source: 'google'
    },
    {
      id: 3,
      user: 'Mike R.',
      rating: 5,
      date: '2024-02-13',
      comment: 'Great tracking system and timely delivery.',
      source: 'app'
    }
  ];

  const handleSubmitReview = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement API call to submit review
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Thank you for your review!');
      setRating(0);
      setReview('');
    } catch (error) {
      alert('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (count, onPress = null) => {
    return Array(5).fill(0).map((_, index) => (
      <TouchableOpacity
        key={index}
        onPress={() => onPress && onPress(index + 1)}
        disabled={!onPress}
      >
        <Ionicons
          name={index < count ? 'star' : 'star-outline'}
          size={24}
          color="#FFD700"
          style={styles.star}
        />
      </TouchableOpacity>
    ));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customer Reviews</Text>
        <View style={styles.ratingOverview}>
          <Text style={styles.averageRating}>4.5</Text>
          <View style={styles.starsContainer}>
            {renderStars(4.5)}
          </View>
          <Text style={styles.totalReviews}>Based on 128 reviews</Text>
        </View>
      </View>

      <View style={styles.writeReview}>
        <Text style={styles.sectionTitle}>Write a Review</Text>
        <View style={styles.ratingInput}>
          <Text style={styles.ratingLabel}>Your Rating:</Text>
          <View style={styles.starsContainer}>
            {renderStars(rating, setRating)}
          </View>
        </View>
        <TextInput
          style={styles.reviewInput}
          placeholder="Share your experience..."
          multiline
          value={review}
          onChangeText={setReview}
        />
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmitReview}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.reviewsList}>
        <Text style={styles.sectionTitle}>Recent Reviews</Text>
        {mockReviews.map(review => (
          <View key={review.id} style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewUser}>
                <Text style={styles.userName}>{review.user}</Text>
                <View style={styles.starsContainer}>
                  {renderStars(review.rating)}
                </View>
              </View>
              {review.source === 'google' && (
                <Image
                  source={require('../assets/google-review.svg')}
                  style={styles.sourceIcon}
                />
              )}
            </View>
            <Text style={styles.reviewDate}>{review.date}</Text>
            <Text style={styles.reviewComment}>{review.comment}</Text>
          </View>
        ))}
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
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  ratingOverview: {
    alignItems: 'center',
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  star: {
    marginHorizontal: 2,
  },
  totalReviews: {
    color: '#666',
    marginTop: 5,
  },
  writeReview: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  ratingInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  ratingLabel: {
    marginRight: 10,
    fontSize: 16,
    color: '#666',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewsList: {
    padding: 20,
  },
  reviewItem: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  reviewUser: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sourceIcon: {
    width: 20,
    height: 20,
  },
  reviewDate: {
    color: '#888',
    fontSize: 14,
    marginBottom: 5,
  },
  reviewComment: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
}));