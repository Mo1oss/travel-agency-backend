-- Lab 7 JOIN queries - run these in MySQL Workbench first, then compare with the API output
USE travel_agency;

-- 1. SELF JOIN: each user with their manager (LEFT JOIN keeps users with no manager)
SELECT e.ID       AS EmployeeID,
       e.USERNAME AS EmployeeName,
       m.USERNAME AS ManagerName
FROM USERS e
LEFT JOIN USERS m ON e.MANAGER_ID = m.ID
ORDER BY e.ID;

-- 2. LEFT JOIN: every trip and its rating(s); unrated trips show NULL
SELECT t.ID AS trip_id, t.DESTINATION, t.COUNTRY, t.COST, r.RATING
FROM TRIP t
LEFT JOIN REVIEW r ON t.ID = r.TRIP_ID
ORDER BY t.ID, r.ID;

-- 3. INNER JOIN: only reviews that match a user AND a trip
SELECT r.ID AS review_id, u.USERNAME, t.DESTINATION, r.RATING
FROM REVIEW r
INNER JOIN USERS u ON r.USER_ID = u.ID
INNER JOIN TRIP  t ON r.TRIP_ID = t.ID
ORDER BY r.ID;
