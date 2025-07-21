#!/usr/bin/env python3
"""Test script for chat branching functionality."""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"


def test_chat_branching():
    """Test the chat branching functionality."""

    # 1. Create initial conversation
    print("1. Creating initial conversation...")
    session_id = f"test_session_{int(datetime.now().timestamp())}"

    # Send first message to create conversation
    response = requests.post(
        f"{BASE_URL}/api/chat/send",
        json={
            "content": "What is my portfolio value?",
            "session_id": session_id,
        },
    )

    if response.status_code != 200:
        print(f"Error sending message: {response.status_code}")
        return

    data = response.json()
    conversation_id = data.get("conversation_id")
    message_id = data.get("message_id")
    print(f"Created conversation {conversation_id} with message {message_id}")

    # 2. Send another message
    print("\n2. Sending follow-up message...")
    response = requests.post(
        f"{BASE_URL}/api/chat/send",
        json={
            "content": "Show me my top positions",
            "session_id": session_id,
            "conversation_id": conversation_id,
        },
    )

    data = response.json()
    second_message_id = data.get("message_id")
    print(f"Sent message {second_message_id}")

    # 3. Get conversation messages
    print("\n3. Getting conversation messages...")
    response = requests.get(
        f"{BASE_URL}/api/chat/conversations/{conversation_id}/messages"
    )
    messages = response.json()["messages"]
    print(f"Found {len(messages)} messages")

    # Find a message to branch from (the first user message)
    user_message = next((msg for msg in messages if msg["role"] == "user"), None)
    if not user_message:
        print("No user message found to branch from")
        return

    branch_from_id = user_message["id"]
    print(
        f"Will branch from message {branch_from_id}: '{user_message['content'][:50]}...'"
    )

    # 4. Create a branch
    print("\n4. Creating branch...")
    response = requests.post(
        f"{BASE_URL}/api/chat/conversations/{conversation_id}/branch",
        json={
            "parent_message_id": branch_from_id,
            "title": "Alternative question branch",
        },
    )

    if response.status_code != 200:
        print(f"Error creating branch: {response.status_code} - {response.text}")
        return

    branch_data = response.json()
    branch_conversation_id = branch_data["conversation_id"]
    print(f"Created branch conversation {branch_conversation_id}")
    print(f"Copied {branch_data['messages_copied']} messages to branch")

    # 5. Get branches for the message
    print("\n5. Getting branches for message...")
    response = requests.get(f"{BASE_URL}/api/chat/messages/{branch_from_id}/branches")
    branches = response.json()["branches"]
    print(f"Found {len(branches)} branches from message {branch_from_id}")
    for branch in branches:
        print(
            f"  - Branch {branch['id']}: {branch['title']} ({branch['message_count']} messages)"
        )

    # 6. Get conversation tree
    print("\n6. Getting conversation tree...")
    response = requests.get(f"{BASE_URL}/api/chat/conversations/{conversation_id}/tree")
    tree = response.json()["tree"]

    def print_tree(node, indent=0):
        prefix = "  " * indent
        print(
            f"{prefix}- {node['title']} (ID: {node['id']}, Messages: {node.get('message_count', 0)})"
        )
        for child in node.get("children", []):
            print_tree(child, indent + 1)

    print("Conversation tree:")
    print_tree(tree)

    # 7. Send message to branch
    print("\n7. Sending message to branch...")
    response = requests.post(
        f"{BASE_URL}/api/chat/send",
        json={
            "content": "What about my risk exposure instead?",
            "session_id": session_id,
            "conversation_id": branch_conversation_id,
        },
    )

    if response.status_code == 200:
        print("Successfully sent message to branch")
    else:
        print(f"Error sending message to branch: {response.status_code}")

    print("\nTest completed successfully!")


if __name__ == "__main__":
    test_chat_branching()
