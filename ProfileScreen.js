import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { FormInput } from '../../components/FormInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    shopName: '',
    address: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsFetching(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/shop-owners/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData({
          name: data.shopOwner?.name || '',
          email: data.shopOwner?.email || '',
          phone: data.shopOwner?.phone || '',
          shopName: data.shopOwner?.shopName || '',
          address: data.shopOwner?.address || ''
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', error.message || 'Failed to fetch profile data');
    } finally {
      setIsFetching(false);
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;
    
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const updateData = {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        shopName: profileData.shopName,
        address: profileData.address
      };

      const response = await fetch(`${API_BASE_URL}/api/shop-owners/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditing(false);
        fetchProfile();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!profileData.name) newErrors.name = 'Name is required';
    if (!profileData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!profileData.phone) newErrors.phone = 'Phone number is required';
    if (!profileData.shopName) newErrors.shopName = 'Shop name is required';
    if (!profileData.address) newErrors.address = 'Address is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <ScrollView style={styles.container}>
      {isFetching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(!isEditing)}
              disabled={isLoading}
            >
              <Text style={styles.editButtonText}>
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <FormInput
              label="Full Name"
              value={profileData.name}
              onChangeText={(text) => setProfileData({ ...profileData, name: text })}
              placeholder="Enter your full name"
              error={errors.name}
              editable={isEditing}
            />

            <FormInput
              label="Email"
              value={profileData.email}
              onChangeText={(text) => setProfileData({ ...profileData, email: text })}
              placeholder="Enter your email"
              keyboardType="email-address"
              error={errors.email}
              editable={isEditing}
            />

            <FormInput
              label="Phone Number"
              value={profileData.phone}
              onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              error={errors.phone}
              editable={isEditing}
            />

            <FormInput
              label="Shop Name"
              value={profileData.shopName}
              onChangeText={(text) => setProfileData({ ...profileData, shopName: text })}
              placeholder="Enter your shop name"
              error={errors.shopName}
              editable={isEditing}
            />

            <FormInput
              label="Address"
              value={profileData.address}
              onChangeText={(text) => setProfileData({ ...profileData, address: text })}
              placeholder="Enter your shop address"
              error={errors.address}
              editable={isEditing}
            />

            {isEditing && (
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleUpdate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Update Profile</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
}); 