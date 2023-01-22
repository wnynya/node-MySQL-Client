
CREATE DATABASE test;
CREATE USER 'tester'@'%' IDENTIFIED BY '123456';
GRANT ALL PRIVILEGES ON test.* to 'tester'@'%';
USE test;

DROP TABLE IF EXISTS `example`;
CREATE TABLE `example` (
  `uid` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eid` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hash` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creation` datetime NOT NULL,
  `meta` longtext COLLATE utf8mb4_unicode_ci DEFAULT '{}',
  PRIMARY KEY (`uid`, `eid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
