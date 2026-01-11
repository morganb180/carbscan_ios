import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { generateUniqueId } from "@/utils/mockApi";
import { carbscanAPI, APIError } from "@/utils/api";
import { getChatMessages, saveChatMessage } from "@/utils/storage";
import { ChatMessage } from "@/types";

function TypingIndicator() {
  const { theme } = useTheme();
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 300 }),
        withTiming(0, { duration: 300 })
      ),
      -1
    );
    setTimeout(() => {
      dot2.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1
      );
    }, 100);
    setTimeout(() => {
      dot3.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1
      );
    }, 200);
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1.value }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2.value }],
  }));
  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3.value }],
  }));

  return (
    <View style={[styles.typingContainer, { backgroundColor: theme.chatBubbleAI }]}>
      <Animated.View style={[styles.dot, { backgroundColor: theme.textSecondary }, dot1Style]} />
      <Animated.View style={[styles.dot, { backgroundColor: theme.textSecondary }, dot2Style]} />
      <Animated.View style={[styles.dot, { backgroundColor: theme.textSecondary }, dot3Style]} />
    </View>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
}

function ChatBubble({ message }: ChatBubbleProps) {
  const { theme } = useTheme();
  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.bubbleContainer,
        isUser ? styles.userBubbleContainer : styles.aiBubbleContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: theme.chatBubbleUser }]
            : [styles.aiBubble, { backgroundColor: theme.chatBubbleAI }],
        ]}
      >
        <ThemedText
          type="body"
          style={isUser ? { color: "#fff" } : undefined}
        >
          {message.content}
        </ThemedText>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { subscription, decrementChatLimit } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const chatLimit = subscription.chatLimit;

  const sendButtonScale = useSharedValue(1);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    const savedMessages = await getChatMessages();
    if (savedMessages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: generateUniqueId(),
        role: "assistant",
        content:
          "Hi! I'm your AI nutrition assistant. I can help you with carb counting, meal planning, and diabetes-friendly recipes. What would you like to know?",
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
      await saveChatMessage(welcomeMessage);
    } else {
      setMessages(savedMessages);
    }
  };

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isTyping || chatLimit <= 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendButtonScale.value = withSequence(
      withSpring(0.9),
      withSpring(1)
    );

    const userMessage: ChatMessage = {
      id: generateUniqueId(),
      role: "user",
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    await saveChatMessage(userMessage);
    setInputText("");
    setIsTyping(true);
    decrementChatLimit();

    try {
      const chatResponse = await carbscanAPI.chat.sendMessage(userMessage.content);

      const aiMessage: ChatMessage = {
        id: generateUniqueId(),
        role: "assistant",
        content: chatResponse.response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      await saveChatMessage(aiMessage);
    } catch (error) {
      console.error("Failed to get response:", error);
      
      let errorMessage = "I'm sorry, I couldn't process your request. Please try again.";
      if (error instanceof APIError) {
        if (error.code === "CHAT_LIMIT_REACHED") {
          errorMessage = error.message;
        }
      }
      
      const errorAiMessage: ChatMessage = {
        id: generateUniqueId(),
        role: "assistant",
        content: errorMessage,
        timestamp: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, errorAiMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [inputText, isTyping, chatLimit, decrementChatLimit]);

  const sendButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <ChatBubble message={item} />
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={styles.limitBanner}>
        <Feather name="message-circle" size={14} color={theme.textSecondary} />
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {chatLimit} messages remaining today
        </ThemedText>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messagesList,
          { paddingBottom: Spacing.lg },
        ]}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        showsVerticalScrollIndicator={false}
      />

      {isTyping ? (
        <View style={styles.typingWrapper}>
          <TypingIndicator />
        </View>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundDefault,
            paddingBottom: insets.bottom + Spacing.sm,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundRoot,
              color: theme.text,
            },
          ]}
          placeholder="Ask about nutrition..."
          placeholderTextColor={theme.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          editable={chatLimit > 0}
        />
        <Animated.View style={sendButtonAnimatedStyle}>
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || isTyping || chatLimit <= 0}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: theme.primary,
                opacity: !inputText.trim() || isTyping || chatLimit <= 0 ? 0.5 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={20} color="#fff" />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  limitBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  bubbleContainer: {
    marginBottom: Spacing.md,
  },
  userBubbleContainer: {
    alignItems: "flex-end",
  },
  aiBubbleContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    borderBottomRightRadius: Spacing.xs,
  },
  aiBubble: {
    borderBottomLeftRadius: Spacing.xs,
  },
  typingWrapper: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignSelf: "flex-start",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
