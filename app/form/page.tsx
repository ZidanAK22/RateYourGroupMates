'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client'; // Correct client import
import { useEffect, useState } from 'react';

// Zod validation schema
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
    const [supabase] = useState(() => createClient()); // Initialize Supabase client
    // CHANGE: Added setValue to the destructuring
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
    const [isLoading, setIsLoading] = useState(false); // Start with false, set to true inside effects
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Watch selected values for dependent queries
    const selectedClass = watch('classId');
    const selectedGroup = watch('groupId');
    const selectedRater = watch('raterId');

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
        // CHANGE: Improved logic to prevent unnecessary resets and stale data
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
                setGroups([]); // Clear groups on error
            } finally {
                setIsLoading(false);
            }
        };
        
        // CHANGE: Use setValue to clear dependent fields instead of reset
        setValue('groupId', '');
        setValue('raterId', '');
        setValue('rateeId', '');
        setParticipants([]); // Also clear participants list immediately

        fetchGroups();
    }, [selectedClass, supabase, setValue]);

    // Fetch participants when group changes
    useEffect(() => {
        // CHANGE: Improved logic for fetching participants
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
                setParticipants([]); // Clear participants on error
            } finally {
                setIsLoading(false);
            }
        };

        // CHANGE: Use setValue to clear dependent fields
        setValue('raterId', '');
        setValue('rateeId', '');

        fetchParticipants();
    }, [selectedGroup, supabase, setValue]);

    const onSubmit: SubmitHandler<RatingFormData> = async (data) => {
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('peer_ratings').insert([{
                rater_id: data.raterId,
                ratee_id: data.rateeId,
                rating_score: data.ratingScore,
                rating_comment: data.ratingComment,
            }]);

            if (error) throw error;

            alert('Rating submitted successfully!');
            reset(); // Reset the entire form to default values after successful submission
        } catch (error) {
            console.error('Submission error:', error);
            alert('Failed to submit rating');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter out the rater from ratee options
    const rateeOptions = participants.filter(p => p.nrp !== selectedRater);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Peer Rating Submission</h2>

            {isLoading && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md">
                    Loading data...
                </div>
            )}

            {/* Class Selection */}
            <div className="mb-4">
                <label className="block text-gray-700 mb-2">Class</label>
                <select
                    {...register('classId')}
                    disabled={isLoading || isSubmitting}
                    className={`w-full px-3 py-2 border rounded-md ${errors.classId ? 'border-red-500' : 'border-gray-300'}`}
                >
                    <option value="">Select a class</option>
                    {classes.map(cls => (
                        <option key={cls.class_id} value={cls.class_id}>
                            {cls.class_name} ({cls.class_id})
                        </option>
                    ))}
                </select>
                {errors.classId && <p className="text-red-500 mt-1">{errors.classId.message}</p>}
            </div>

            {/* Group Selection */}
            <div className="mb-4">
                <label className="block text-gray-700 mb-2">Project Group</label>
                <select
                    {...register('groupId')}
                    disabled={!selectedClass || isLoading || isSubmitting}
                    className={`w-full px-3 py-2 border rounded-md ${errors.groupId ? 'border-red-500' : 'border-gray-300'}`}
                >
                    <option value="">Select a group</option>
                    {groups.map(group => (
                        <option key={group.group_id} value={group.group_id}>
                            {group.group_name} ({group.group_id})
                        </option>
                    ))}
                </select>
                {errors.groupId && <p className="text-red-500 mt-1">{errors.groupId.message}</p>}
            </div>

            {/* Rater Selection */}
            <div className="mb-4">
                <label className="block text-gray-700 mb-2">Rater (You)</label>
                <select
                    {...register('raterId')}
                    disabled={!selectedGroup || isLoading || isSubmitting}
                    className={`w-full px-3 py-2 border rounded-md ${errors.raterId ? 'border-red-500' : 'border-gray-300'}`}
                >
                    <option value="">Select yourself</option>
                    {participants.map(p => (
                        <option key={p.nrp} value={p.nrp}>
                            {p.full_name} ({p.nrp})
                        </option>
                    ))}
                </select>
                {errors.raterId && <p className="text-red-500 mt-1">{errors.raterId.message}</p>}
            </div>

            {/* Ratee Selection */}
            <div className="mb-4">
                <label className="block text-gray-700 mb-2">Ratee (Team Member)</label>
                <select
                    {...register('rateeId')}
                    disabled={!selectedRater || rateeOptions.length === 0 || isLoading || isSubmitting}
                    className={`w-full px-3 py-2 border rounded-md ${errors.rateeId ? 'border-red-500' : 'border-gray-300'}`}
                >
                    <option value="">Select a team member</option>
                    {rateeOptions.map(p => (
                        <option key={p.nrp} value={p.nrp}>
                            {p.full_name} ({p.nrp})
                        </option>
                    ))}
                </select>
                {errors.rateeId && <p className="text-red-500 mt-1">{errors.rateeId.message}</p>}
            </div>

            {/* Rating Score */}
            <div className="mb-4">
                <label className="block text-gray-700 mb-2">Rating (1-5)</label>
                <input
                    type="number"
                    min="1"
                    max="5"
                    disabled={isLoading || isSubmitting}
                    {...register('ratingScore', { valueAsNumber: true })}
                    className={`w-full px-3 py-2 border rounded-md ${errors.ratingScore ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.ratingScore && <p className="text-red-500 mt-1">{errors.ratingScore.message}</p>}
            </div>

            {/* Comments */}
            <div className="mb-6">
                <label className="block text-gray-700 mb-2">Comments</label>
                <textarea
                    {...register('ratingComment')}
                    disabled={isLoading || isSubmitting}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Provide constructive feedback..."
                />
            </div>

            <button
                type="submit"
                disabled={isLoading || isSubmitting}
                className={`w-full text-white font-bold py-3 px-4 rounded-md transition duration-200 ${(isLoading || isSubmitting) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
            >
                {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>
        </form>
    );
}