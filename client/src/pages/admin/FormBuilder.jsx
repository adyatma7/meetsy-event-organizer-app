import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Database, Code, ExternalLink } from 'lucide-react';
import api from '../../lib/api';
import useAppStore from '../../stores/useAppStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Skeleton from '../../components/ui/Skeleton';

const STANDARD_FIELDS = [
  { id: 'name', label: 'Full Name', type: 'text', required: true },
  { id: 'email', label: 'Email Address', type: 'email', required: true },
  { id: 'phone', label: 'Phone Number', type: 'text', required: false },
  { id: 'company', label: 'Company Name', type: 'text', required: false },
  { id: 'jobTitle', label: 'Job Title', type: 'text', required: false },
  { id: 'industry', label: 'Industry', type: 'text', required: false },
  { id: 'city', label: 'City', type: 'text', required: false }
];

export default function FormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useAppStore(state => state.addToast);
  
  const [event, setEvent] = useState(null);
  const [schema, setSchema] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/admin/events/${id}`);
      setEvent(res);
      setSchema(res.formSchema || []);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to load event' });
      navigate('/events');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSchema = async () => {
    try {
      setIsSaving(true);
      await api.put(`/admin/events/${id}/form`, { schema });
      addToast({ type: 'success', title: 'Saved', message: 'Form schema saved successfully.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to save schema' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires setting data to drag
    e.dataTransfer.setData('text/plain', index.toString());
    setTimeout(() => {
      if (e.target && e.target.style) {
        e.target.style.opacity = '0.4';
      }
    }, 0);
  };

  const handleDragEnter = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    
    const newSchema = [...schema];
    const draggedItem = newSchema[draggedIndex];
    newSchema.splice(draggedIndex, 1);
    newSchema.splice(targetIndex, 0, draggedItem);
    
    setDraggedIndex(targetIndex);
    setSchema(newSchema);
  };

  const handleDragEnd = (e) => {
    if (e.target && e.target.style) {
      e.target.style.opacity = '1';
    }
    setDraggedIndex(null);
  };

  const addStandardField = (stdField) => {
    if (schema.some(f => f.id === stdField.id)) return;
    setSchema([...schema, { ...stdField, isStandard: true }]);
  };

  const addCustomField = (type) => {
    const newField = {
      id: `custom_${Date.now()}`,
      type,
      label: `New Custom Question`,
      required: false,
      isStandard: false,
      ...(type === 'select' || type === 'radio' ? { options: ['Option 1'] } : {})
    };
    setSchema([...schema, newField]);
  };

  const removeField = (index) => {
    const newSchema = [...schema];
    newSchema.splice(index, 1);
    setSchema(newSchema);
  };

  const updateField = (index, updates) => {
    const newSchema = [...schema];
    newSchema[index] = { ...newSchema[index], ...updates };
    setSchema(newSchema);
  };

  const updateOptions = (index, optionsStr) => {
    const options = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
    updateField(index, { options });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-9 h-9 rounded-md" />
            <div>
              <Skeleton className="h-7 w-48 rounded-md" />
              <Skeleton className="h-4 w-64 mt-2 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        </div>
        <div className="flex gap-6 items-start">
          {/* Toolbox skeleton */}
          <div className="w-72 flex-shrink-0 space-y-6">
            <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-md p-4 shadow-brutal dark:shadow-brutal-dark">
              <Skeleton className="h-4 w-40 mb-4 rounded-md" />
              <Skeleton className="h-3 w-full mb-3 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-md p-4 shadow-brutal dark:shadow-brutal-dark">
              <Skeleton className="h-4 w-40 mb-4 rounded-md" />
              <Skeleton className="h-3 w-full mb-3 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </div>
          </div>
          {/* Builder area skeleton */}
          <div className="flex-1 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-md p-5 shadow-brutal dark:shadow-brutal-dark">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-5 h-5 mt-2 rounded-md" />
                  <div className="flex-1 space-y-4">
                    <Skeleton className="h-5 w-24 rounded-md" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 flex-1 rounded-md" />
                      <Skeleton className="h-10 w-48 rounded-md" />
                    </div>
                    <Skeleton className="h-px w-full" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28 rounded-md" />
                      <Skeleton className="h-4 w-4 rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Which standard fields are not yet in the schema?
  const availableStandardFields = STANDARD_FIELDS.filter(sf => !schema.some(f => f.id === sf.id));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/events/${id}`)}
            className="p-2 -ml-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white uppercase">Form Builder</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Customize the registration form for {event?.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={ExternalLink} onClick={() => window.open(`/register/${event?.slug}`, '_blank')}>
            Preview Form
          </Button>
          <Button onClick={saveSchema} isLoading={isSaving} icon={Save}>
            Save Form
          </Button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Toolbox */}
        <div className="w-72 flex-shrink-0 space-y-6 sticky top-6">
          <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-md p-4 shadow-brutal dark:shadow-brutal-dark">
            <h3 className="font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
              <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Standard Fields (SQL)
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 leading-relaxed">
              These fields map directly to your master database columns.
            </p>
            <div className="space-y-2">
              {availableStandardFields.length === 0 ? (
                <div className="text-sm text-neutral-400 dark:text-neutral-500 italic">All standard fields added.</div>
              ) : (
                availableStandardFields.map(sf => (
                  <Button 
                    key={sf.id} 
                    variant="secondary" 
                    className="w-full justify-start text-sm py-1.5" 
                    onClick={() => addStandardField(sf)}
                  >
                    + {sf.label}
                  </Button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-md p-4 shadow-brutal dark:shadow-brutal-dark">
            <h3 className="font-black text-neutral-900 dark:text-white flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
              <Code className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Custom Fields (JSONB)
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 leading-relaxed">
              Add event-specific questions (e.g. Dietary Req). Saved flexibly.
            </p>
            <div className="space-y-2">
              <Button variant="secondary" className="w-full justify-start text-sm py-1.5" onClick={() => addCustomField('text')}>+ Short Answer</Button>
              <Button variant="secondary" className="w-full justify-start text-sm py-1.5" onClick={() => addCustomField('select')}>+ Dropdown Select</Button>
              <Button variant="secondary" className="w-full justify-start text-sm py-1.5" onClick={() => addCustomField('radio')}>+ Multiple Choice</Button>
            </div>
          </div>
        </div>

        {/* Builder Area */}
        <div className="flex-1 space-y-4">
          {schema.length === 0 ? (
            <div className="bg-white dark:bg-neutral-800 border-2 border-dashed border-neutral-900 dark:border-neutral-700 rounded-md p-12 text-center">
              <p className="text-neutral-500 dark:text-neutral-400">This form is empty. Add a field from the left panel.</p>
            </div>
          ) : (
            schema.map((field, index) => {
              const isNameOrEmail = field.id === 'name' || field.id === 'email';
              const isStandard = field.isStandard || STANDARD_FIELDS.some(sf => sf.id === field.id);
              
              return (
                <div 
                  key={field.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`bg-white dark:bg-neutral-800 border-2 rounded-md p-5 shadow-brutal dark:shadow-brutal-dark group transition-all duration-200 ${isStandard ? 'border-indigo-500 dark:border-indigo-400' : 'border-neutral-900 dark:border-neutral-700'} ${draggedIndex === index ? 'shadow-brutal-lg border-primary-500 scale-[1.02]' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-2 text-neutral-400 dark:text-neutral-500 cursor-grab active:cursor-grabbing hover:text-neutral-900 dark:hover:text-white transition-colors">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-4">
                      
                      <div className="flex items-center gap-2 mb-1">
                        {isStandard ? (
                          <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-md border-2 border-indigo-700 dark:border-indigo-500 font-black">
                            <Database className="w-3 h-3" /> SQL: {field.id}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 rounded-md border-2 border-amber-700 dark:border-amber-500 font-black">
                            <Code className="w-3 h-3" /> Custom: {field.id}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <Input 
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          className="font-bold"
                          placeholder="Question title"
                          readOnly={isNameOrEmail} // Force name and email label to stay standard, though you could allow rename
                        />
                        <select 
                          className="block w-48 rounded-md border-2 border-neutral-900 dark:border-neutral-500 py-2 px-3 text-neutral-900 dark:text-white font-bold bg-white dark:bg-neutral-900 focus:outline-none focus:border-primary-600 dark:focus:border-primary-400 sm:text-sm sm:leading-6 disabled:bg-neutral-50 dark:disabled:bg-neutral-800 disabled:text-neutral-500 dark:disabled:text-neutral-400"
                          value={field.type}
                          onChange={(e) => updateField(index, { type: e.target.value })}
                          disabled={isNameOrEmail}
                        >
                          <option value="text">Short Answer</option>
                          <option value="email">Email input</option>
                          <option value="select">Dropdown Select</option>
                          <option value="radio">Multiple Choice</option>
                        </select>
                      </div>

                      {(field.type === 'select' || field.type === 'radio') && (
                        <Input 
                          label="Options (comma separated)"
                          value={(field.options || []).join(', ')}
                          onChange={(e) => updateOptions(index, e.target.value)}
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      )}

                      <div className="flex items-center justify-between pt-4 border-t-2 border-neutral-900 dark:border-neutral-700">
                        <label className={`flex items-center gap-2 ${isNameOrEmail ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                          <input 
                            type="checkbox" 
                            checked={isNameOrEmail ? true : field.required}
                            onChange={(e) => {
                              if (isNameOrEmail) {
                                addToast({ type: 'info', title: 'System Field', message: 'Name and Email are mandatory for ticketing.' });
                                return;
                              }
                              updateField(index, { required: e.target.checked });
                            }}
                            className={`rounded border-2 border-neutral-900 dark:border-neutral-500 text-primary-600 focus:ring-primary-600 ${isNameOrEmail ? 'cursor-not-allowed' : ''}`}
                          />
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            Required field {isNameOrEmail && <span className="text-xs text-primary-600 dark:text-primary-400 font-bold ml-1">(Mandatory)</span>}
                          </span>
                        </label>
                        {!isNameOrEmail && (
                          <button 
                            onClick={() => removeField(index)}
                            className="text-neutral-400 dark:text-neutral-500 hover:text-danger-600 dark:hover:text-danger-400 transition-colors p-1"
                            title="Delete field"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
