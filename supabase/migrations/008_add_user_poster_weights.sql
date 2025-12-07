-- User-Poster Weights: Tracks how much each user likes content from each poster
-- Weights are updated based on feedback (up/down votes) and influence future content generation

CREATE TABLE IF NOT EXISTS user_poster_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  poster_id text REFERENCES posters(id) NOT NULL,
  weight numeric DEFAULT 1.0 NOT NULL,
  total_up_votes integer DEFAULT 0 NOT NULL,
  total_down_votes integer DEFAULT 0 NOT NULL,
  last_feedback_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, poster_id)
);

-- Enable RLS
ALTER TABLE user_poster_weights ENABLE ROW LEVEL SECURITY;

-- Users can only access their own weights
CREATE POLICY "Users can view own poster weights"
  ON user_poster_weights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own poster weights"
  ON user_poster_weights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own poster weights"
  ON user_poster_weights FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS user_poster_weights_user_idx ON user_poster_weights(user_id);
CREATE INDEX IF NOT EXISTS user_poster_weights_lookup_idx ON user_poster_weights(user_id, poster_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_poster_weights_updated_at
  BEFORE UPDATE ON user_poster_weights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update weights based on feedback
-- Called when a post receives feedback
CREATE OR REPLACE FUNCTION update_poster_weight_on_feedback()
RETURNS TRIGGER AS $$
DECLARE
  weight_change numeric;
  current_weight numeric;
BEGIN
  -- Calculate weight change based on feedback
  -- Up vote: +0.1, Down vote: -0.15 (asymmetric to penalize bad content more)
  IF NEW.feedback = 'up' AND (OLD.feedback IS NULL OR OLD.feedback != 'up') THEN
    weight_change := 0.1;
  ELSIF NEW.feedback = 'down' AND (OLD.feedback IS NULL OR OLD.feedback != 'down') THEN
    weight_change := -0.15;
  ELSIF NEW.feedback IS NULL AND OLD.feedback = 'up' THEN
    -- Undoing an upvote
    weight_change := -0.1;
  ELSIF NEW.feedback IS NULL AND OLD.feedback = 'down' THEN
    -- Undoing a downvote
    weight_change := 0.15;
  ELSE
    -- No change needed (same feedback or other edge case)
    RETURN NEW;
  END IF;

  -- Upsert the weight record
  INSERT INTO user_poster_weights (user_id, poster_id, weight, total_up_votes, total_down_votes, last_feedback_at)
  VALUES (
    NEW.user_id, 
    NEW.poster_id, 
    GREATEST(0.1, LEAST(2.0, 1.0 + weight_change)), -- Clamp between 0.1 and 2.0
    CASE WHEN NEW.feedback = 'up' THEN 1 ELSE 0 END,
    CASE WHEN NEW.feedback = 'down' THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id, poster_id) DO UPDATE SET
    weight = GREATEST(0.1, LEAST(2.0, user_poster_weights.weight + weight_change)),
    total_up_votes = user_poster_weights.total_up_votes + 
      CASE 
        WHEN NEW.feedback = 'up' AND (OLD.feedback IS NULL OR OLD.feedback != 'up') THEN 1
        WHEN NEW.feedback IS NULL AND OLD.feedback = 'up' THEN -1
        ELSE 0 
      END,
    total_down_votes = user_poster_weights.total_down_votes + 
      CASE 
        WHEN NEW.feedback = 'down' AND (OLD.feedback IS NULL OR OLD.feedback != 'down') THEN 1
        WHEN NEW.feedback IS NULL AND OLD.feedback = 'down' THEN -1
        ELSE 0 
      END,
    last_feedback_at = now(),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on posts table to auto-update weights
CREATE TRIGGER posts_feedback_weight_update
  AFTER UPDATE OF feedback ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_poster_weight_on_feedback();

