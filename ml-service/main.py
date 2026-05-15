from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import numpy as np

app = FastAPI(title="EventHub ML Recommendation Service")

class Event(BaseModel):
    id: int
    title: str
    description: str
    location: str
    price: float
    rating: float

class RecommendationRequest(BaseModel):
    target_event_id: int
    all_events: List[Event]

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/recommend")
def recommend_events(request: RecommendationRequest):
    if not request.all_events:
        return []

    events = [e.dict() for e in request.all_events]
    df = pd.DataFrame(events)
    
    if request.target_event_id not in df['id'].values:
        raise HTTPException(status_code=404, detail="Target event not found in the provided list")

    target_idx = df[df['id'] == request.target_event_id].index[0]
    target_event = events[target_idx]

    # Combined text features
    event_texts = [f"{e['title']} {e['description']} {e['location']}" for e in events]
    
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform(event_texts)
    
    # Calculate text similarity
    cosine_sim = cosine_similarity(tfidf_matrix[target_idx], tfidf_matrix).flatten()
    
    # Add boosts for price proximity and location match
    target_price = target_event['price']
    target_loc = target_event['location'].lower()
    
    final_scores = []
    for i, event in enumerate(events):
        if i == target_idx:
            final_scores.append(-1.0)
            continue
            
        score = cosine_sim[i]
        
        # Location boost (20% boost if same location)
        if event['location'].lower() == target_loc:
            score += 0.2
        
        # Price proximity boost (up to 10% boost if prices are similar)
        price_diff = abs(event['price'] - target_price)
        if target_price > 0:
            price_ratio = 1.0 - min(price_diff / target_price, 1.0)
            score += (price_ratio * 0.1)
            
        # Rating boost (up to 30% boost for high-rated events)
        rating_val = event.get('rating', 0.0)
        rating_boost = (rating_val / 5.0) * 0.3
        score += rating_boost
            
        final_scores.append(score)
    
    # Get top 4 indices
    top_indices = np.argsort(final_scores)[-4:][::-1]
    
    # Return event IDs
    recommended_ids = [int(events[i]['id']) for i in top_indices]
    
    return {"recommended_event_ids": recommended_ids}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
