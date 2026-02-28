
CREATE TABLE accepted_requests (
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, user_id)
);
