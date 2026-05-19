'use client';

import { useState } from 'react';
import { Star, MessageSquare, Filter, Plus, User, Calendar, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export function ReviewSystem({ category = 'system', targetName = '', targetId = '' }) {
    const [reviews, setReviews] = useState([
        {
            id: 1,
            user: 'Ahmed Hassan',
            rating: 5,
            comment: 'Excellent service for our poultry farm. The mortality tracking is a game changer.',
            date: '2024-03-20',
            category: 'poultry-farm',
            verified: true
        },
        {
            id: 2,
            user: 'Zainab Bibi',
            rating: 4,
            comment: 'The solar panel warranty tracking is very helpful, but could use more alerts.',
            date: '2024-03-18',
            category: 'solar-energy',
            verified: true
        }
    ]);

    const [activeFilter, setActiveFilter] = useState('all');
    const [showAddReview, setShowAddReview] = useState(false);
    const [newReview, setNewReview] = useState({
        rating: 5,
        comment: '',
        category: category
    });

    const filteredReviews = activeFilter === 'all'
        ? reviews
        : reviews.filter(r => r.category === activeFilter);

    const handleSubmit = (e) => {
        e.preventDefault();
        const review = {
            ...newReview,
            id: Date.now(),
            user: 'Current User',
            date: new Date().toISOString().split('T')[0],
            verified: false
        };
        setReviews([review, ...reviews]);
        setShowAddReview(false);
        setNewReview({ rating: 5, comment: '', category: category });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Reviews & Feedback</h2>
                    <p className="text-gray-600">See what others are saying about our {category} expertise</p>
                </div>
                <div className="flex gap-2">
                    <Select value={activeFilter} onValueChange={setActiveFilter}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Filter by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Domains</SelectItem>
                            <SelectItem value="poultry-farm">Poultry Farm</SelectItem>
                            <SelectItem value="solar-energy">Solar Energy</SelectItem>
                            <SelectItem value="hardware-sanitary">Hardware</SelectItem>
                            <SelectItem value="auto-workshop">Auto Workshop</SelectItem>
                        </SelectContent>
                    </Select>

                    <Dialog open={showAddReview} onOpenChange={setShowAddReview}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Review
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Write a Review</DialogTitle>
                                <DialogDescription>
                                    Share your experience with our {category} system.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Rating</Label>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setNewReview({ ...newReview, rating: star })}
                                                className="transition-transform hover:scale-110"
                                            >
                                                <Star
                                                    className={`w-8 h-8 ${star <= newReview.rating ? 'fill-wine text-wine' : 'text-gray-300'}`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="comment">Your Feedback</Label>
                                    <Textarea
                                        id="comment"
                                        placeholder="Tell us what you think..."
                                        value={newReview.comment}
                                        onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                        required
                                    />
                                </div>
                                <DialogFooter>
                                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all" type="submit">Submit Review</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredReviews.length === 0 ? (
                    <Card className="bg-gray-50 border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-10">
                            <MessageSquare className="w-12 h-12 text-gray-400 mb-2" />
                            <p className="text-gray-500 font-medium">No reviews yet for this category</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredReviews.map((review) => (
                        <Card key={review.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <User className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-gray-900">{review.user}</p>
                                            {review.verified && (
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    className={`w-3 h-3 ${s <= review.rating ? 'fill-wine text-wine' : 'text-gray-300'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge variant="outline" className="capitalize">
                                        {review.category.replace('-', ' ')}
                                    </Badge>
                                    <div className="flex items-center text-xs text-gray-500">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {review.date}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    {review.comment}
                                </p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
