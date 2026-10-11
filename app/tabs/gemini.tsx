import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';

export default function GeminiScreen() {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: "I am The CSEC Sentinel, your advanced cybersecurity AI. My primary protocol is to educate and protect you from cyber threats, especially phishing attacks. State your inquiry or paste a suspicious link to begin."}
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  React.useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';

  const userBubbleBg = isDark ? '#3B82F6' : '#2563EB';
  const modelBubbleBg = isDark ? '#1A242E' : '#FFFFFF';
  const inputBg = isDark ? '#1A242E' : '#FFFFFF';

  const renderMessageText = (text: string, isUser: boolean) => {
    // Strip markdown headings (e.g., ### )
    const cleanText = text.replace(/^#+\s+/gm, '');
    const parts = cleanText.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={index} style={[
            styles.bubbleText, 
            isUser ? { color: '#FFF' } : { color: textColorPrimary },
            { fontWeight: 'bold' }
          ]}>
            {part.replace(/\*\*/g, '')}
          </Text>
        );
      }
      return (
        <Text key={index} style={[
          styles.bubbleText, 
          isUser ? { color: '#FFF' } : { color: textColorPrimary }
        ]}>
          {part.replace(/\*/g, '')}
        </Text>
      );
    });
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Format history for Gemini
      const formattedHistory = messages.map(m => ({
        role: m.role,
        parts: m.text
      }));

      // NOTE: Using localhost/codespace URL based on the scan.tsx endpoint but updated for /gemini-chat
      const apiUrl = 'https://csec-sentinel-api.onrender.com/gemini-chat';
      const user = auth.currentUser;
      const idToken = user ? await user.getIdToken() : '';

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true'
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userMessage, history: formattedHistory }),
      });

      if (response.status === 401) {
        setMessages(prev => [...prev, { role: 'model', text: "Authentication required. Please log in to chat with The Sentinel." }]);
        return;
      }

      if (response.status === 429) {
        setMessages(prev => [...prev, { role: 'model', text: "Rate limit reached. Please wait a minute before sending another message." }]);
        return;
      }

      const data = await response.json();

      if (response.ok && data.status === 'success') {
         setMessages(prev => [...prev, { role: 'model', text: data.response }]);
      } else {
         setMessages(prev => [...prev, { role: 'model', text: data.error || "The Sentinel encountered an interference error." }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Connection to the Sentinel Engine failed. Ensure the AI Server is online." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: bgColor }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="chat-processing-outline" size={24} color={isDark ? '#4DA8DA' : '#2563EB'} />
          <Text style={[styles.headerTitle, { color: textColorPrimary }]}>Chatbot</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: textColorSecondary }]}>Advanced AI Threat Expert</Text>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatArea} 
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, index) => (
          <View key={index} style={[
            styles.messageWrapper, 
            msg.role === 'user' ? styles.messageWrapperUser : styles.messageWrapperModel
          ]}>
            {msg.role === 'model' && (
               <View style={[styles.avatar, { backgroundColor: isDark ? '#233240' : '#E8EDF2' }]}>
                 <MaterialCommunityIcons name="robot-outline" size={16} color={isDark ? '#4DA8DA' : '#2563EB'} />
               </View>
            )}
            
            <View style={[
              styles.bubble, 
              msg.role === 'user' 
                ? [styles.bubbleUser, { backgroundColor: userBubbleBg }] 
                : [styles.bubbleModel, { backgroundColor: modelBubbleBg }]
            ]}>
              <Text>{renderMessageText(msg.text, msg.role === 'user')}</Text>
            </View>
          </View>
        ))}
        
        {isLoading && (
          <View style={[styles.messageWrapper, styles.messageWrapperModel]}>
            <View style={[styles.avatar, { backgroundColor: isDark ? '#233240' : '#E8EDF2' }]}>
               <MaterialCommunityIcons name="robot-outline" size={16} color={isDark ? '#4DA8DA' : '#2563EB'} />
            </View>
            <View style={[styles.bubble, styles.bubbleModel, { backgroundColor: modelBubbleBg, padding: 16 }]}>
              <ActivityIndicator size="small" color={isDark ? '#4DA8DA' : '#2563EB'} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { backgroundColor: bgColor, paddingBottom: isKeyboardVisible ? 10 : 80 }]}>
        <View style={[styles.inputWrapper, { backgroundColor: inputBg }]}>
          <TextInput
            style={[styles.input, { color: textColorPrimary }]}
            placeholder="Ask the Chatbot..."
            placeholderTextColor={textColorSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: inputText.trim() ? (isDark ? '#4DA8DA' : '#2563EB') : '#9CA3AF' }]} 
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Feather name="send" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 5 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', marginLeft: 8 },
  headerSubtitle: { fontSize: 12, marginTop: 2, opacity: 0.8 },
  
  chatArea: { flex: 1 },
  messageWrapper: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end' },
  messageWrapperUser: { justifyContent: 'flex-end' },
  messageWrapperModel: { justifyContent: 'flex-start' },
  
  avatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleModel: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },

  inputContainer: { padding: 12, paddingBottom: 80 },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: 24, padding: 8, paddingHorizontal: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  input: { flex: 1, minHeight: 40, maxHeight: 100, paddingTop: 10, paddingBottom: 10, fontSize: 16 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginBottom: 2 },
});
