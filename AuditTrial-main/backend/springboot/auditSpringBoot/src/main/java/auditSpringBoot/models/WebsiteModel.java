package auditSpringBoot.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
@Entity
@Table(name = "website_model")
public class WebsiteModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    String name;

    @ElementCollection(fetch = FetchType.EAGER)
    List<String> allUsersEmailList;

    @ElementCollection(fetch = FetchType.EAGER)
    List<String> allActiveUsersEmailList;

    @ElementCollection(fetch = FetchType.EAGER)
    List<String> deletedUsersEmailList;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public List<String> getAllUsersEmailList() { return allUsersEmailList; }
    public void setAllUsersEmailList(List<String> allUsersEmailList) { this.allUsersEmailList = allUsersEmailList; }
    public List<String> getAllActiveUsersEmailList() { return allActiveUsersEmailList; }
    public void setAllActiveUsersEmailList(List<String> allActiveUsersEmailList) { this.allActiveUsersEmailList = allActiveUsersEmailList; }
    public List<String> getDeletedUsersEmailList() { return deletedUsersEmailList; }
    public void setDeletedUsersEmailList(List<String> deletedUsersEmailList) { this.deletedUsersEmailList = deletedUsersEmailList; }
}