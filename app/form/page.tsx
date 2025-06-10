'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

// Zod validation schema (no changes)
const RatingSchema = z.object({
    classId: z.string().min(1, 'Class is required'),
    groupId: z.string().min(1, 'Group is required'),
    raterId: z.string().min(1, 'Rater is required'),
    rateeId: z.string().min(1, 'Ratee is required'),
    ratingScore: z.number()
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating cannot exceed 5'),
    ratingComment: z.string().optional(),
});

type RatingFormData = z.infer<typeof RatingSchema>;

export default function PeerRatingForm() {
    const [supabase] = useState(() => createClient());
    const { register, handleSubmit, watch, formState: { errors }, reset, setValue } = useForm<RatingFormData>({
        resolver: zodResolver(RatingSchema),
        defaultValues: {
            ratingScore: 3,
            classId: '',
            groupId: '',
            raterId: '',
            rateeId: '',
        }
    });

    const [classes, setClasses] = useState<Array<{ class_id: string; class_name: string }>>([]);
    const [groups, setGroups] = useState<Array<{ group_id: string; group_name: string }>>([]);
    const [participants, setParticipants] = useState<Array<{ nrp: string; full_name: string }>>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedClass = watch('classId');
    const selectedGroup = watch('groupId');
    const selectedRater = watch('raterId');

    // All useEffect and onSubmit logic remains the same as the previous corrected version.
    // ... (fetchClasses, fetchGroups, fetchParticipants, onSubmit logic)

    // Fetch classes on mount
    useEffect(() => {
        const fetchClasses = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('classes')
                    .select('class_id, class_name');
                if (error) throw error;
                if (data) setClasses(data);
            } catch (error) {
                console.error('Error fetching classes:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchClasses();
    }, [supabase]);

    // Fetch groups when class changes
    useEffect(() => {
        const fetchGroups = async () => {
            if (!selectedClass) {
                setGroups([]);
                setParticipants([]);
                return;
            }
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('project_groups')
                    .select('group_id, group_name')
                    .eq('class_id', selectedClass);
                if (error) throw error;
                setGroups(data || []);
            } catch (error) {
                console.error('Error fetching groups:', error);
                setGroups([]);
            } finally {
                setIsLoading(false);
            }
        };
        setValue('groupId', '');
        setValue('raterId', '');
        setValue('rateeId', '');
        setParticipants([]);
        fetchGroups();
    }, [selectedClass, supabase, setValue]);

    // Fetch participants when group changes
    useEffect(() => {
        const fetchParticipants = async () => {
            if (!selectedGroup) {
                setParticipants([]);
                return;
            }
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('participants')
                    .select('nrp, full_name')
                    .eq('group_id', selectedGroup);
                if (error) throw error;
                setParticipants(data || []);
            } catch (error) {
                console.error('Error fetching participants:', error);
                setParticipants([]);
            } finally {
                setIsLoading(false);
            }
        };
        setValue('raterId', '');
        setValue('rateeId', '');
        fetchParticipants();
    }, [selectedGroup, supabase, setValue]);
    
    const onSubmit: SubmitHandler<RatingFormData> = async (data) => {
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('peer_ratings').insert([
                {
                    rater_id: data.raterId,
                    ratee_id: data.rateeId,
                    rating_score: data.ratingScore,
                    rating_comment: data.ratingComment,
                },
            ]);
            if (error) throw error;
            alert('Rating submitted successfully!');
            reset();
        } catch (error) {
            console.error('Submission error:', error);
            alert('Failed to submit rating');
        } finally {
            setIsSubmitting(false);
        }
    };

    const rateeOptions = participants.filter(p => p.nrp !== selectedRater);

    // CHANGE: Added a wrapper div for vertical centering
    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl w-full mx-auto p-6 bg-white rounded-lg shadow-md">
                {/* CHANGE: Text color changed to black */}
                <h2 className="text-2xl font-bold mb-6 text-black">Peer Rating Submission</h2>

                {isLoading && (
                    // CHANGE: Text and background colors modified
                    <div className="mb-4 p-3 bg-gray-100 text-black rounded-md">
                        Loading data...
                    </div>
                )}

                {/* Class Selection */}
                <div className="mb-4">
                    {/* CHANGE: Text color changed to black */}
                    <label className="block text-black mb-2">Class</label>
                    <select
                        {...register('classId')}
                        disabled={isLoading || isSubmitting}
                        className={`w-full px-3 py-2 border rounded-md text-black ${errors.classId ? 'border-black' : 'border-gray-300'}`}
                    >
                        <option value="">Select a class</option>
                        {classes.map(cls => (
                            <option key={cls.class_id} value={cls.class_id}>
                                {cls.class_name} ({cls.class_id})
                            </option>
                        ))}
                    </select>
                    {/* CHANGE: Error text color changed to black */}
                    {errors.classId && <p className="text-black mt-1">{errors.classId.message}</p>}
                </div>

                {/* Group Selection */}
                <div className="mb-4">
                    <label className="block text-black mb-2">Project Group</label>
                    <select
                        {...register('groupId')}
                        disabled={!selectedClass || isLoading || isSubmitting}
                        className={`w-full px-3 py-2 border rounded-md text-black ${errors.groupId ? 'border-black' : 'border-gray-300'}`}
                    >
                        <option value="">Select a group</option>
                        {groups.map(group => (
                            <option key={group.group_id} value={group.group_id}>
                                {group.group_name} ({group.group_id})
                            </option>
                        ))}
                    </select>
                    {errors.groupId && <p className="text-black mt-1">{errors.groupId.message}</p>}
                </div>

                {/* Rater Selection */}
                <div className="mb-4">
                    <label className="block text-black mb-2">Rater (You)</label>
                    <select
                        {...register('raterId')}
                        disabled={!selectedGroup || isLoading || isSubmitting}
                        className={`w-full px-3 py-2 border rounded-md text-black ${errors.raterId ? 'border-black' : 'border-gray-300'}`}
                    >
                        <option value="">Select yourself</option>
                        {participants.map(p => (
                            <option key={p.nrp} value={p.nrp}>
                                {p.full_name} ({p.nrp})
                            </option>
                        ))}
                    </select>
                    {errors.raterId && <p className="text-black mt-1">{errors.raterId.message}</p>}
                </div>

                {/* Ratee Selection */}
                <div className="mb-4">
                    <label className="block text-black mb-2">Ratee (Team Member)</label>
                    <select
                        {...register('rateeId')}
                        disabled={!selectedRater || rateeOptions.length === 0 || isLoading || isSubmitting}
                        className={`w-full px-3 py-2 border rounded-md text-black ${errors.rateeId ? 'border-black' : 'border-gray-300'}`}
                    >
                        <option value="">Select a team member</option>
                        {rateeOptions.map(p => (
                            <option key={p.nrp} value={p.nrp}>
                                {p.full_name} ({p.nrp})
                            </option>
                        ))}
                    </select>
                    {errors.rateeId && <p className="text-black mt-1">{errors.rateeId.message}</p>}
                </div>

                {/* Rating Score */}
                <div className="mb-4">
                    <label className="block text-black mb-2">Rating (1-5)</label>
                    <input
                        type="number"
                        min="1"
                        max="5"
                        disabled={isLoading || isSubmitting}
                        {...register('ratingScore', { valueAsNumber: true })}
                        className={`w-full px-3 py-2 border rounded-md text-black ${errors.ratingScore ? 'border-black' : 'border-gray-300'}`}
                    />
                    {errors.ratingScore && <p className="text-black mt-1">{errors.ratingScore.message}</p>}
                </div>

                {/* Comments */}
                <div className="mb-6">
                    <label className="block text-black mb-2">Comments</label>
                    <textarea
                        {...register('ratingComment')}
                        disabled={isLoading || isSubmitting}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-black placeholder:text-gray-500"
                        placeholder="Provide constructive feedback..."
                    />
                </div>

                {/* CHANGE: Button text and background colors modified for readability */}
                <button
                    type="submit"
                    disabled={isLoading || isSubmitting}
                    className={`w-full text-black font-bold py-3 px-4 rounded-md transition duration-200 ${(isLoading || isSubmitting) ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
            </form>
        </div>
    );
}