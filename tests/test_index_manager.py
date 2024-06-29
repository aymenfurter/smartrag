import unittest
from app.index_manager import IndexManager, IndexConfig, ContainerNameTooLongError, create_index_manager

class TestIndexManager(unittest.TestCase):

    def test_index_config_creation(self):
        config = IndexConfig("user1", "index1", True)
        self.assertEqual(config.user_id, "user1")
        self.assertEqual(config.index_name, "index1")
        self.assertTrue(config.is_restricted)

    def test_index_manager_creation(self):
        config = IndexConfig("user1", "index1", True)
        manager = IndexManager(config)
        self.assertEqual(manager.config, config)
        self.assertTrue(manager.base_container_name.startswith("user1-index1"))

    def test_create_base_container_name_restricted(self):
        config = IndexConfig("user1", "index1", True)
        manager = IndexManager(config)
        self.assertEqual(manager.base_container_name, "user1-index1")

    def test_create_base_container_name_unrestricted(self):
        config = IndexConfig("user1", "index1", False)
        manager = IndexManager(config)
        self.assertEqual(manager.base_container_name, "open-index1")

    def test_create_base_container_name_too_long(self):
        long_name = "a" * 100
        config = IndexConfig("user1", long_name, True)
        with self.assertRaises(ContainerNameTooLongError):
            IndexManager(config)

    def test_get_ingestion_container(self):
        config = IndexConfig("user1", "index1", True)
        manager = IndexManager(config)
        self.assertEqual(manager.get_ingestion_container(), "user1-index1-ingestion")

    def test_get_reference_container(self):
        config = IndexConfig("user1", "index1", True)
        manager = IndexManager(config)
        self.assertEqual(manager.get_reference_container(), "user1-index1-reference")

    def test_get_search_index_name(self):
        config = IndexConfig("user1", "index1", True)
        manager = IndexManager(config)
        self.assertEqual(manager.get_search_index_name(), "user1-index1-ingestion")

    def test_user_has_access_restricted_correct_user(self):
        config = IndexConfig("user1", "index1", True)
        manager = IndexManager(config)
        self.assertTrue(manager.user_has_access())


    def test_user_has_access_unrestricted(self):
        config = IndexConfig("user1", "index1", False)
        manager = IndexManager(config)
        self.assertTrue(manager.user_has_access())

    def test_sanitize_container_name(self):
        test_cases = [
            ("Normal-Name123", "normal-name123"),
            ("UPPERCASE", "uppercase"),
            ("special!@#characters", "special-characters"),
            ("a" * 100, "a" * 63),
            ("trailing-dash-", "trailing-dash"),
            ("-leading-dash", "leading-dash"),
            ("  spaces  ", "spaces"),
            ("under_score", "under-score"),
        ]
        for input_name, expected_output in test_cases:
            with self.subTest(input_name=input_name):
                self.assertEqual(IndexManager.sanitize_container_name(input_name), expected_output)

    def test_create_index_containers(self):
        containers = IndexManager.create_index_containers("user1", "index1", True)
        self.assertEqual(len(containers), 2)
        self.assertEqual(containers[0], "user1-index1-ingestion")
        self.assertEqual(containers[1], "user1-index1-reference")

    def test_parse_container_name_restricted(self):
        index_name, is_restricted = IndexManager.parse_container_name("user1-index1-ingestion")
        self.assertEqual(index_name, "index1")
        self.assertTrue(is_restricted)

    def test_parse_container_name_unrestricted(self):
        index_name, is_restricted = IndexManager.parse_container_name("open-index1-ingestion")
        self.assertEqual(index_name, "index1")
        self.assertFalse(is_restricted)

    def test_parse_container_name_invalid(self):
        index_name, is_restricted = IndexManager.parse_container_name("invalid-container-name")
        self.assertEqual(index_name, "")
        self.assertFalse(is_restricted)

    def test_create_index_manager_factory_function(self):
        manager = create_index_manager("user1", "index1", True)
        self.assertIsInstance(manager, IndexManager)
        self.assertEqual(manager.config.user_id, "user1")
        self.assertEqual(manager.config.index_name, "index1")
        self.assertTrue(manager.config.is_restricted)

    def test_max_container_name_length(self):
        self.assertEqual(IndexManager.MAX_CONTAINER_NAME_LENGTH, 63)

    def test_ingestion_suffix(self):
        self.assertEqual(IndexManager.INGESTION_SUFFIX, "-ingestion")

    def test_reference_suffix(self):
        self.assertEqual(IndexManager.REFERENCE_SUFFIX, "-reference")

    def test_create_base_container_name_edge_case(self):
        config = IndexConfig("user1", "a" * (63 - len("user1-") - len("-ingestion")), True)
        manager = IndexManager(config)
        self.assertEqual(len(manager.base_container_name), 63 - len("-ingestion"))

    def test_create_base_container_name_just_over_limit(self):
        config = IndexConfig("user1", "a" * (64 - len("user1-") - len("-ingestion")), True)
        with self.assertRaises(ContainerNameTooLongError):
            IndexManager(config)

if __name__ == '__main__':
    unittest.main()