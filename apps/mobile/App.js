import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from './src/config';

const Tab = createBottomTabNavigator();

const card = { backgroundColor: '#131A2A', borderRadius: 18, padding: 16, marginBottom: 16 };

function HomeScreen() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);

  const loadCredits = async () => {
    const res = await fetch(`${API_URL}/credits`);
    const data = await res.json();
    setCredits(data.credits);
  };

  useEffect(() => { loadCredits(); }, []);

  const send = async (endpoint) => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      Alert.alert('OK', 'Generación completada');
      setPrompt('');
      loadCredits();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>AI Creator Studio</Text>
      <Text style={styles.subtitle}>Créditos: {credits}</Text>
      <View style={card}>
        <Text style={styles.label}>Prompt</Text>
        <TextInput value={prompt} onChangeText={setPrompt} placeholder="Describe tu creación" placeholderTextColor="#667085" style={styles.input} multiline />
        {loading ? <ActivityIndicator color="#fff" /> : (
          <>
            <TouchableOpacity style={styles.button} onPress={() => send('/generate/image')}><Text style={styles.buttonText}>Text → Image</Text></TouchableOpacity>
            <TouchableOpacity style={styles.buttonSecondary} onPress={() => send('/generate/text-to-video')}><Text style={styles.buttonText}>Text → Video</Text></TouchableOpacity>
          </>
        )}
      </View>
      <ImageToVideoCard onDone={loadCredits} />
    </SafeAreaView>
  );
}

function ImageToVideoCard({ onDone }) {
  const [image, setImage] = useState(null);
  const [prompt, setPrompt] = useState('cinematic motion');
  const [loading, setLoading] = useState(false);

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const upload = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate/image-to-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: image, prompt })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      Alert.alert('OK', 'Video generado');
      onDone();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={card}>
      <Text style={styles.label}>Image → Video</Text>
      <TouchableOpacity style={styles.upload} onPress={pick}><Text style={styles.buttonText}>{image ? 'Imagen seleccionada' : 'Seleccionar imagen'}</Text></TouchableOpacity>
      <TextInput value={prompt} onChangeText={setPrompt} style={styles.input} placeholder="Motion prompt" placeholderTextColor="#667085" />
      <TouchableOpacity style={styles.buttonSecondary} onPress={upload} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear video</Text>}</TouchableOpacity>
    </View>
  );
}

function GalleryScreen() {
  const [items, setItems] = useState([]);

  const load = async () => {
    const res = await fetch(`${API_URL}/gallery`);
    setItems(await res.json());
  };

  useEffect(() => { load(); }, []);

  const shareItem = async (url, filename) => {
    const local = FileSystem.documentDirectory + filename;
    const download = await FileSystem.downloadAsync(url, local);
    await Sharing.shareAsync(download.uri);
  };

  const renderItem = ({ item }) => (
    <View style={card}>
      <Text style={styles.galleryPrompt}>{item.prompt}</Text>
      {item.type === 'image' ? <Image source={{ uri: item.url }} style={styles.image} /> : <View style={styles.videoPlaceholder}><MaterialIcons name="movie" size={42} color="#fff" /><Text style={styles.videoText}>Video listo</Text></View>}
      <View style={styles.row}>
        <TouchableOpacity style={styles.smallButton} onPress={() => shareItem(item.url, item.filename)}><Text style={styles.buttonText}>Share</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList data={items} keyExtractor={item => item.id} renderItem={renderItem} onRefresh={load} refreshing={false} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Tab.Navigator screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0B0F19', borderTopColor: '#1F2937' },
        tabBarIcon: ({ color, size }) => {
          const icon = route.name === 'Create' ? 'auto-awesome' : 'photo-library';
          return <MaterialIcons name={icon} color={color} size={size} />;
        }
      })}>
        <Tab.Screen name="Create" component={HomeScreen} />
        <Tab.Screen name="Gallery" component={GalleryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19', padding: 16 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#98A2B3', marginBottom: 16 },
  label: { color: '#fff', marginBottom: 10, fontWeight: '600' },
  input: { backgroundColor: '#111827', color: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, minHeight: 54 },
  button: { backgroundColor: '#7C3AED', padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  buttonSecondary: { backgroundColor: '#2563EB', padding: 16, borderRadius: 14, alignItems: 'center' },
  upload: { backgroundColor: '#1F2937', padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: '700' },
  image: { width: '100%', height: 320, borderRadius: 16, marginTop: 12 },
  galleryPrompt: { color: '#fff', fontWeight: '600', marginBottom: 10 },
  row: { flexDirection: 'row', marginTop: 12 },
  smallButton: { backgroundColor: '#374151', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  videoPlaceholder: { height: 220, borderRadius: 16, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  videoText: { color: '#fff', marginTop: 8 },
});
