# Testing Floating Chat with Branching Integration

## Test Cases

### 1. Basic Floating Chat
- [ ] Click purple circle to open floating chat
- [ ] Send a message and receive response
- [ ] Minimize/maximize chat window
- [ ] Close chat window

### 2. Save Conversation
- [ ] Start new chat with a message
- [ ] Click menu (three dots) → Save Conversation
- [ ] Verify "Saved" badge appears
- [ ] Verify conversation title updates

### 3. View in Full Chat
- [ ] Save a conversation
- [ ] Click menu → View Full Chat
- [ ] Verify navigation to /chat/[id]
- [ ] Verify conversation loads correctly

### 4. Create Branch
- [ ] Save a conversation
- [ ] Hover over a message
- [ ] Click branch icon
- [ ] Fill branch creation modal
- [ ] Verify branch is created

### 5. Chat History Integration
- [ ] Navigate to /chat-history
- [ ] Find a conversation
- [ ] Click "Open in floating chat" button
- [ ] Verify conversation loads in floating chat
- [ ] Verify navigation back to home

### 6. Auto-save on First Message
- [ ] Open new floating chat
- [ ] Send first message
- [ ] Verify conversation auto-saves
- [ ] Check saved status

## Implementation Summary

### Components Updated:
1. **FloatingChatContext** - Added conversation management state
2. **FloatingChatInput** - Added:
   - Save conversation functionality
   - Branch creation from messages
   - Menu with actions
   - Load existing conversations
   - Auto-save on first message

3. **ChatHistoryItem** - Added "Open in floating chat" button

### New Files:
1. **useOpenInFloatingChat** - Hook for opening conversations in floating chat

### Features:
- Seamless transition between ephemeral and saved chats
- Full branching support within floating chat
- Integration with chat history
- Visual indicators for saved/branch status
- Quick actions menu