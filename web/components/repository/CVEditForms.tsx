"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit, Save, X, Plus, Trash2 } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  category: string;
  magnitude: number;
  description: string;
  tags: string[];
}

interface WorkExperience {
  id: string;
  title: string;
  company: string;
  department?: string;
  location: string;
  dateStart: string;
  dateEnd: string | null;
  tagline: string;
  note?: string;
  achievements: any[];
}

interface Education {
  id: string;
  degree: string;
  field: string;
  institution: string;
  location: string;
  dateStart: string;
  dateEnd: string;
  tagline: string;
  note?: string;
  focusAreas: string[];
  achievements: string[];
}

export function SkillEditForm({ skill, onSave, onCancel }: { skill: Skill; onSave: (data: Partial<Skill>) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState(skill);
  const [newTag, setNewTag] = useState("");

  const handleSave = () => {
    onSave(formData);
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Card className="shadow-lg border-[#E5E0D8]">
      <CardHeader className="border-b border-[#E5E0D8] pb-4 bg-[#FAF8F2]">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="font-semibold text-[#2A2520]">Edit Skill: {skill.name}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="gap-2 border-[#D5D0C8] text-[#5C5550] hover:bg-[#F5F3F0] hover:text-[#2A2520]">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#2A2520]">Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="h-10 border-[#E5E0D8]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#2A2520]">Category</Label>
          <Input
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="h-10 border-[#E5E0D8]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#2A2520]">Magnitude (1-4)</Label>
          <Select value={String(formData.magnitude)} onValueChange={(v) => setFormData({ ...formData, magnitude: parseInt(v) })}>
            <SelectTrigger className="h-10 border-[#E5E0D8]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-white border-[#E5E0D8]">
              <SelectItem value="1">1 - Beginner</SelectItem>
              <SelectItem value="2">2 - Apprentice</SelectItem>
              <SelectItem value="3">3 - Professional</SelectItem>
              <SelectItem value="4">4 - Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#2A2520]">Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="resize-none border-[#E5E0D8]"
            spellCheck="false"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#2A2520]">Tags</Label>
          <div className="flex flex-wrap gap-2 mb-2 min-h-[36px] p-2 border border-[#E5E0D8] rounded-md bg-[#FAF8F2]">
            {formData.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1 bg-[#00A0A4]/10 text-[#007A7D] border border-[#00A0A4]/30 hover:bg-[#00A0A4]/20"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-red-600 focus:outline-none"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {formData.tags.length === 0 && (
              <span className="text-sm text-[#A0998A]">No tags</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="h-9 flex-1 border-[#E5E0D8]"
              placeholder="Add a tag..."
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTag}
              disabled={!newTag.trim()}
              className="h-9 border-[#D5D0C8] text-[#5C5550] hover:bg-[#F5F3F0] hover:text-[#2A2520] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExperienceEditForm({ experience, onSave, onCancel }: { experience: WorkExperience; onSave: (data: Partial<WorkExperience>) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState(experience);

  const handleSave = () => {
    onSave(formData);
  };

  const addAchievement = () => {
    setFormData({
      ...formData,
      achievements: [...formData.achievements, { category: "", description: "", tags: [] }],
    });
  };

  const removeAchievement = (index: number) => {
    setFormData({
      ...formData,
      achievements: formData.achievements.filter((_, i) => i !== index),
    });
  };

  return (
    <Card className="border-[#E5E0D8]">
      <CardHeader className="border-b border-[#E5E0D8] pb-4 bg-[#FAF8F2]">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="font-semibold text-[#2A2520]">Edit Experience: {experience.title}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="gap-2 border-[#D5D0C8] text-[#5C5550] hover:bg-[#F5F3F0] hover:text-[#2A2520]">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Title</Label>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="h-10" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Company</Label>
            <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="h-10" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Location</Label>
            <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="h-10" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Department</Label>
            <Input value={formData.department || ""} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="h-10" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Start Date (YYYY-MM)</Label>
            <Input value={formData.dateStart} onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })} className="h-10" placeholder="2023-08" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">End Date (YYYY-MM or leave empty)</Label>
            <Input value={formData.dateEnd || ""} onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value || null })} className="h-10" placeholder="2025-04 or leave empty" />
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Tagline</Label>
          <Input value={formData.tagline} onChange={(e) => setFormData({ ...formData, tagline: e.target.value })} className="h-10" />
        </div>
        <div>
          <Label className="text-sm font-medium">Note</Label>
          <Textarea value={formData.note || ""} onChange={(e) => setFormData({ ...formData, note: e.target.value })} rows={2} className="resize-none" spellCheck="false" />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-medium">Achievements</Label>
            <Button variant="outline" size="sm" onClick={addAchievement}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {formData.achievements.map((ach, idx) => (
              <div key={idx} className="flex gap-2 rounded border p-2">
                <Textarea
                  value={typeof ach === "string" ? ach : ach.description || ""}
                  onChange={(e) => {
                    const newAchievements = [...formData.achievements];
                    newAchievements[idx] = typeof ach === "string" ? e.target.value : { ...ach, description: e.target.value };
                    setFormData({ ...formData, achievements: newAchievements });
                  }}
                  rows={2}
                  className="flex-1 resize-none" spellCheck="false"
                />
                <Button variant="ghost" size="sm" onClick={() => removeAchievement(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EducationEditForm({ education, onSave, onCancel }: { education: Education; onSave: (data: Partial<Education>) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState(education);

  const handleSave = () => {
    onSave(formData);
  };

  const addFocusArea = () => {
    setFormData({
      ...formData,
      focusAreas: [...formData.focusAreas, ""],
    });
  };

  const removeFocusArea = (index: number) => {
    setFormData({
      ...formData,
      focusAreas: formData.focusAreas.filter((_, i) => i !== index),
    });
  };

  const addAchievement = () => {
    setFormData({
      ...formData,
      achievements: [...formData.achievements, ""],
    });
  };

  const removeAchievement = (index: number) => {
    setFormData({
      ...formData,
      achievements: formData.achievements.filter((_, i) => i !== index),
    });
  };

  return (
    <Card className="border-[#E5E0D8]">
      <CardHeader className="border-b border-[#E5E0D8] pb-4 bg-[#FAF8F2]">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="font-semibold text-[#2A2520]">Edit Education: {education.degree}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="gap-2 border-[#D5D0C8] text-[#5C5550] hover:bg-[#F5F3F0] hover:text-[#2A2520]">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Degree</Label>
            <Input value={formData.degree} onChange={(e) => setFormData({ ...formData, degree: e.target.value })} className="h-10" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Field</Label>
            <Input value={formData.field} onChange={(e) => setFormData({ ...formData, field: e.target.value })} className="h-10" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Institution</Label>
            <Input value={formData.institution} onChange={(e) => setFormData({ ...formData, institution: e.target.value })} className="h-10" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Location</Label>
            <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="h-10" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Start Date (YYYY-MM)</Label>
            <Input value={formData.dateStart} onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })} className="h-10" placeholder="2023-08" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">End Date (YYYY-MM)</Label>
            <Input value={formData.dateEnd} onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })} className="h-10" placeholder="2023-02" />
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Tagline</Label>
          <Input value={formData.tagline} onChange={(e) => setFormData({ ...formData, tagline: e.target.value })} className="h-10" />
        </div>
        <div>
          <Label className="text-sm font-medium">Note</Label>
          <Textarea value={formData.note || ""} onChange={(e) => setFormData({ ...formData, note: e.target.value })} rows={2} className="resize-none" spellCheck="false" />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-medium">Focus Areas</Label>
            <Button variant="outline" size="sm" onClick={addFocusArea}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {formData.focusAreas.map((area, idx) => (
              <div key={idx} className="flex gap-2">
                <Input 
                  value={area} 
                  onChange={(e) => {
                    const newAreas = [...formData.focusAreas];
                    newAreas[idx] = e.target.value;
                    setFormData({ ...formData, focusAreas: newAreas });
                  }} 
                  className="h-10"
                />
                <Button variant="ghost" size="sm" onClick={() => removeFocusArea(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-medium">Achievements</Label>
            <Button variant="outline" size="sm" onClick={addAchievement}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {formData.achievements.map((ach, idx) => (
              <div key={idx} className="flex gap-2">
                <Input 
                  value={ach} 
                  onChange={(e) => {
                    const newAchievements = [...formData.achievements];
                    newAchievements[idx] = e.target.value;
                    setFormData({ ...formData, achievements: newAchievements });
                  }} 
                  className="h-10"
                />
                <Button variant="ghost" size="sm" onClick={() => removeAchievement(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
