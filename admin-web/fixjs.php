<?php
$file = '/www/wwwroot/139.196.185.197_7070/doo/admin-web/script.js';
$js = file_get_contents($file);

// Fix feedback endpoint (template literal with backticks)
$old1 = "feedback: `/admin_feedback.php?page=\${currentPage}&limit=\${currentLimit}`";
$new1 = "feedback: `/../admin-web/api-bridge.php?__route=admin_feedback.php&page=\${currentPage}&limit=\${currentLimit}`";
$count = 0;
$js = str_replace($old1, $new1, $js, $count);
echo "feedback: replaced $count\n";

// Fix user_profile endpoint
$old2 = "user_profile: '/user_profile.php?action=profile'";
$new2 = "user_profile: '/../admin-web/api-bridge.php?__route=user_profile.php&action=profile'";
$js = str_replace($old2, $new2, $js, $count);
echo "user_profile: replaced $count\n";

// Fix content_similarity endpoint
$old3 = "content_similarity: '/user_profile.php?action=content_similarity'";
$new3 = "content_similarity: '/../admin-web/api-bridge.php?__route=user_profile.php&action=content_similarity'";
$js = str_replace($old3, $new3, $js, $count);
echo "content_similarity: replaced $count\n";

file_put_contents($file, $js);
echo 'DONE';
