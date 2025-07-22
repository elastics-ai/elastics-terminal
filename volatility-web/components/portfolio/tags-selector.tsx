'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Tag {
  id: string
  label: string
}

interface TagsSelectorProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  availableTags: Tag[]
  placeholder?: string
}

export function TagsSelector({ 
  selectedTags, 
  onTagsChange, 
  availableTags,
  placeholder = "Enter Tags"
}: TagsSelectorProps) {
  const handleAddTag = (tagId: string) => {
    if (!selectedTags.includes(tagId)) {
      onTagsChange([...selectedTags, tagId])
    }
  }

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter(id => id !== tagId))
  }

  const unselectedTags = availableTags.filter(tag => !selectedTags.includes(tag.id))

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Tags</label>
      <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-input rounded-md bg-background">
        {selectedTags.map(tagId => {
          const tag = availableTags.find(t => t.id === tagId)
          if (!tag) return null
          
          return (
            <Badge 
              key={tag.id} 
              variant="secondary"
              className="gap-1 pr-1"
            >
              {tag.label}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )
        })}
        
        {unselectedTags.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                {placeholder}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {unselectedTags.map(tag => (
                <DropdownMenuItem
                  key={tag.id}
                  onClick={() => handleAddTag(tag.id)}
                  className="text-sm"
                >
                  {tag.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}