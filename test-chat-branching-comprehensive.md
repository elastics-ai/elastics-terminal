# Comprehensive Test Plan for Chat Branching Feature

## Overview
This document outlines a comprehensive testing strategy for the chat branching feature in the volatility filter application. The feature allows users to create branches from specific messages in a conversation, enabling exploration of different conversation paths.

## Test Scope

### 1. Backend Unit Tests

#### A. Database Operations (`src/volatility_filter/database.py`)
- **Test `create_chat_conversation` with branch support**
  - ✓ Create conversation with parent_message_id
  - ✓ Copy messages up to branch point
  - ✓ Validate parent message exists
  - ✓ Handle invalid parent_message_id
  - ✓ Ensure transaction atomicity

- **Test `get_conversation_tree`**
  - ✓ Build tree for conversation with no branches
  - ✓ Build tree for conversation with single branch
  - ✓ Build tree for multi-level branches
  - ✓ Handle circular references (edge case)
  - ✓ Include message counts in tree nodes

- **Test `_build_conversation_tree` recursion**
  - ✓ Correct parent-child relationships
  - ✓ Proper tree traversal
  - ✓ Performance with deep trees

#### B. Pydantic Models (`src/volatility_filter/models/chat.py`)
- **Test `BranchCreate` model**
  - ✓ Valid parent_message_id validation
  - ✓ Optional title handling
  - ✓ Field constraints

- **Test `ConversationTree` model**
  - ✓ Recursive tree structure serialization
  - ✓ JSON encoding/decoding
  - ✓ Deep nesting limits

- **Test `Conversation` with branches**
  - ✓ parent_message_id field handling
  - ✓ Serialization with branch info

### 2. API Integration Tests

#### A. Branch Creation Endpoint (`POST /api/chat/conversations/{conversation_id}/branch`)
- **Success Cases**
  - ✓ Create branch from user message
  - ✓ Create branch from assistant message
  - ✓ Create branch with custom title
  - ✓ Create branch without title (auto-generated)
  - ✓ Create multiple branches from same message

- **Error Cases**
  - ✓ Invalid conversation_id (404)
  - ✓ Invalid parent_message_id (404)
  - ✓ Parent message not in conversation (400)
  - ✓ Missing required fields (422)

- **Data Integrity**
  - ✓ Messages copied correctly to branch
  - ✓ Message order preserved
  - ✓ Timestamps maintained
  - ✓ New conversation has correct parent_message_id

#### B. Get Branches Endpoint (`GET /api/chat/messages/{message_id}/branches`)
- **Success Cases**
  - ✓ Get branches for message with no branches
  - ✓ Get branches for message with single branch
  - ✓ Get branches for message with multiple branches
  - ✓ Branch metadata included (title, message count, created_at)

- **Error Cases**
  - ✓ Invalid message_id (404)
  - ✓ Message exists but in deleted conversation

#### C. Get Conversation Tree Endpoint (`GET /api/chat/conversations/{conversation_id}/tree`)
- **Success Cases**
  - ✓ Tree for linear conversation (no branches)
  - ✓ Tree for conversation with single branch
  - ✓ Tree for conversation with nested branches
  - ✓ Tree includes all metadata

- **Error Cases**
  - ✓ Invalid conversation_id (404)
  - ✓ Empty conversation handling

#### D. Chat Send with Branch Context (`POST /api/chat/send`)
- **Branch-specific behavior**
  - ✓ Send message to branch conversation
  - ✓ Context includes branch history
  - ✓ Response maintains branch context
  - ✓ Branch ID preserved in response

### 3. Frontend Unit Tests

#### A. React Components

**BranchSwitcher Component**
- ✓ Renders current branch name
- ✓ Shows dropdown with all branches
- ✓ Highlights current branch
- ✓ Handles branch switch click
- ✓ Updates URL on branch switch
- ✓ Shows branch creation date/time
- ✓ Handles loading state
- ✓ Handles error state

**BranchCreationModal Component**
- ✓ Opens when branch button clicked
- ✓ Pre-fills suggested title
- ✓ Validates title length
- ✓ Calls API on create
- ✓ Shows loading during creation
- ✓ Handles creation errors
- ✓ Closes and navigates on success
- ✓ Cancel button works

**BranchBreadcrumb Component**
- ✓ Shows full branch path
- ✓ Each segment is clickable
- ✓ Navigates to branch on click
- ✓ Shows "Main" for root
- ✓ Truncates long paths
- ✓ Shows tooltip on hover

**ChatTreeView Component**
- ✓ Renders tree structure correctly
- ✓ Nodes are interactive
- ✓ Current branch highlighted
- ✓ Click navigates to branch
- ✓ Zoom controls work
- ✓ Pan functionality
- ✓ Auto-centers on current branch
- ✓ Handles large trees efficiently

### 4. End-to-End Tests

#### A. Basic Branch Flow
```typescript
test('user creates and navigates branches', async ({ page }) => {
  // 1. Start conversation
  // 2. Send initial message
  // 3. Get AI response
  // 4. Create branch from user message
  // 5. Send different message in branch
  // 6. Switch back to main
  // 7. Verify original conversation intact
  // 8. Switch to branch
  // 9. Verify branch conversation
});
```

#### B. Multi-level Branching
```typescript
test('user creates nested branches', async ({ page }) => {
  // 1. Create initial conversation
  // 2. Create branch A from message 1
  // 3. Continue in branch A
  // 4. Create branch B from branch A message
  // 5. Verify tree shows nested structure
  // 6. Navigate using tree view
  // 7. Verify breadcrumb shows full path
});
```

#### C. Concurrent Branch Usage
```typescript
test('multiple users can work on different branches', async ({ browser }) => {
  // 1. User A creates conversation
  // 2. User A creates branch
  // 3. User B opens main conversation
  // 4. User A sends message to branch
  // 5. User B sends message to main
  // 6. Verify isolation between branches
  // 7. Verify both can see tree structure
});
```

#### D. Branch UI Integration
```typescript
test('branch UI elements work together', async ({ page }) => {
  // 1. Hover shows branch button
  // 2. Click opens modal
  // 3. Create branch
  // 4. Breadcrumb updates
  // 5. Switcher shows new branch
  // 6. Tree view updates
  // 7. URL reflects branch
  // 8. Refresh maintains branch
});
```

### 5. Performance Tests

#### A. Large Tree Performance
- Create conversation with 50+ branches
- Measure tree rendering time
- Verify smooth navigation
- Test memory usage

#### B. Deep Nesting Performance
- Create 10-level deep branches
- Test tree traversal speed
- Verify UI responsiveness

#### C. Concurrent Operations
- Multiple users creating branches simultaneously
- WebSocket message handling under load
- API response times with many branches

### 6. Edge Cases and Error Scenarios

#### A. Data Integrity
- ✓ Deleting parent conversation
- ✓ Branching from deleted message
- ✓ Circular branch references
- ✓ Orphaned branches

#### B. UI Edge Cases
- ✓ Very long branch titles
- ✓ Special characters in titles
- ✓ Rapid branch switching
- ✓ Browser back/forward navigation
- ✓ Deep linking to branches

#### C. Concurrency Issues
- ✓ Two users branching from same message
- ✓ Branching while message being sent
- ✓ Deleting message with branches
- ✓ WebSocket disconnection during branch creation

### 7. Security Tests

#### A. Authorization
- ✓ User can only branch own conversations
- ✓ User can only view own branches
- ✓ Branch API requires authentication
- ✓ Tree API respects conversation ownership

#### B. Input Validation
- ✓ SQL injection in branch titles
- ✓ XSS in branch titles
- ✓ Invalid UUIDs handled
- ✓ Rate limiting on branch creation

### 8. Accessibility Tests

- ✓ Keyboard navigation in tree view
- ✓ Screen reader announces branches
- ✓ Branch switcher keyboard accessible
- ✓ Modal focus management
- ✓ ARIA labels on interactive elements

## Test Implementation Strategy

### Phase 1: Backend Unit Tests (Priority: High)
1. Database operations tests
2. Model validation tests
3. Helper function tests

### Phase 2: API Integration Tests (Priority: High)
1. Branch CRUD operations
2. Error handling
3. Data consistency

### Phase 3: Frontend Component Tests (Priority: Medium)
1. Individual component unit tests
2. Component integration tests
3. State management tests

### Phase 4: E2E Tests (Priority: High)
1. Critical user journeys
2. Branch navigation flows
3. Multi-user scenarios

### Phase 5: Performance & Edge Cases (Priority: Medium)
1. Load testing
2. Edge case handling
3. Security validation

## Test Data Requirements

### Fixtures Needed:
1. Sample conversations with various depths
2. Pre-created branches for testing
3. Mock user sessions
4. Performance test data generators

### Mock Requirements:
1. Claude API responses for consistent testing
2. WebSocket message simulators
3. Database state snapshots

## Success Criteria

- **Code Coverage**: Minimum 80% for new code
- **E2E Pass Rate**: 100% for critical paths
- **Performance**: Tree rendering < 100ms for 50 branches
- **No Critical Bugs**: All security/data integrity tests pass

## Monitoring and Maintenance

### Post-Deployment:
1. Monitor branch creation rates
2. Track tree rendering performance
3. Log branch-related errors
4. User feedback on branch UX

### Regular Testing:
1. Weekly E2E test runs
2. Performance benchmarks monthly
3. Security scans quarterly