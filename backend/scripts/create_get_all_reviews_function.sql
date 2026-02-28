-- Create a function to get all reviews with usernames
CREATE OR REPLACE FUNCTION get_all_reviews()
RETURNS TABLE (
    id BIGINT,
    subject TEXT,
    rating SMALLINT,
    description TEXT,
    image_urls TEXT[],
    created_at TIMESTAMPTZ,
    reviewer_username TEXT,
    reviewee_username TEXT,
    reviewer_role TEXT
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.subject,
        r.rating,
        r.description,
        r.image_urls,
        r.created_at,
        reviewer.username AS reviewer_username,
        reviewee.username AS reviewee_username,
        r.reviewer_role
    FROM
        reviews r
    LEFT JOIN
        users reviewer ON r.reviewer_id = reviewer.id
    LEFT JOIN
        users reviewee ON r.reviewee_id = reviewee.id
    ORDER BY
        r.created_at DESC;
END;
$$ LANGUAGE plpgsql;
